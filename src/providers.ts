import * as vscode from "vscode";
import path from "node:path";
import crypto from "node:crypto";
import { isMap, isSeq, Scalar } from "yaml";
import { structure, variants, scalarPatch, blockAt } from "./document";
import {
  locate,
  repository,
  addPatches,
  errorMessage,
  readDocument,
} from "./host";
import { enumerate, exercisePath, relativeId } from "./repository";
import { exerciseInsertion } from "./commands";
import { exercise, validate } from "./core";
import { exerciseTemplates } from "./templates";

const selector: vscode.DocumentSelector = [
  { scheme: "file", language: "yaml" },
  { scheme: "file", language: "markdown" },
];
const range = (doc: vscode.TextDocument, n: any) =>
  new vscode.Range(doc.positionAt(n.range[0]), doc.positionAt(n.range[1]));
export class Providers implements vscode.CodeLensProvider {
  private changed = new vscode.EventEmitter<void>();
  onDidChangeCodeLenses = this.changed.event;
  diagnostics = vscode.languages.createDiagnosticCollection("verifiche");
  private pending = new Map<string, number>();
  constructor(private context: vscode.ExtensionContext) {}
  fire() {
    this.changed.fire();
  }
  dispose() {
    this.changed.dispose();
    this.diagnostics.dispose();
  }
  provideCodeLenses(doc: vscode.TextDocument) {
    const loc = locate(doc.uri);
    if (!loc) return [];
    const result: vscode.CodeLens[] = [];
    const lens = (
      at: number,
      title: string,
      command: string,
      args: any[] = [],
    ) =>
      result.push(
        new vscode.CodeLens(
          new vscode.Range(doc.positionAt(at), doc.positionAt(at)),
          {
            title,
            command: "verifiche." + command,
            arguments: [doc.uri, ...args],
          },
        ),
      );
    if (!doc.getText().trim()) {
      lens(
        0,
        loc.kind === "esercizi"
          ? "Inserisci template esercizio"
          : "Inserisci template verifica",
        "template",
      );
      if (loc.kind === "esercizi")
        for (const t of exerciseTemplates.filter((t) => t.type !== "A"))
          lens(0, t.name, "template", [t.type]);
      return result;
    }
    if (loc.kind === "esercizi") {
      lens(0, "Aggiungi variante", "addVariant");
      for (const v of variants(doc.getText())) {
        lens(v.start, "Duplica variante", "duplicateVariant", [v.id]);
        lens(v.start, "Rinomina variante", "renameVariant", [v.id]);
      }
      return result;
    }
    try {
      const s = structure(doc.getText()),
        traces = s.doc.get("tracce", true);
      if (isSeq(traces)) {
        lens(traces.range?.[0] ?? 0, "Aggiungi traccia", "addTrace");
        for (const t of traces.items)
          if (isMap(t)) {
            const id = String(t.get("id")),
              at = t.range?.[0] ?? 0;
            lens(at, "Elimina", "deleteTrace", [id]);
            lens(at, "Rinomina", "renameTrace", [id]);
            lens(at, "Duplica", "duplicateTrace", [id]);
          }
      }
      const list = s.doc.get("blocchi", true);
      if (isSeq(list) && !list.items.length)
        lens(list.range?.[0] ?? 0, "Inserisci blocco", "addBlock", [
          list.range?.[0],
        ]);
      for (const b of s.blocks) {
        const at = b.node.range![0];
        lens(at, "+ Prima", "addBlock", [at, "before"]);
        lens(at, "+ Dopo", "addBlock", [at, "after"]);
        if (b.node.has("gruppo"))
          lens(at, "+ Nel gruppo", "addBlock", [at, "inside"]);
      }
      // A single action per use avoids multiplying buttons by the number of traces.
      for (const r of s.references)
        lens(r.node.range![0], "Scegli variante…", "chooseVariant", [
          r.node.range![0],
        ]);
    } catch {
      /* Syntax errors are reported separately; typing remains available. */
    }
    return result;
  }
  async diagnose(doc: vscode.TextDocument) {
    const loc = locate(doc.uri);
    if (!loc) return;
    const key = doc.uri.toString(),
      generation = (this.pending.get(key) ?? 0) + 1;
    this.pending.set(key, generation);
    const diagnostics: vscode.Diagnostic[] = [];
    const add = (
      message: string,
      severity = vscode.DiagnosticSeverity.Error,
      r = new vscode.Range(0, 0, 0, Math.max(1, doc.lineAt(0).text.length)),
    ) => diagnostics.push(new vscode.Diagnostic(r, message, severity));
    if (doc.getText().trim())
      try {
        if (loc.kind === "esercizi") exercise(doc.getText(), loc.id);
        else {
          const s = structure(doc.getText());
          for (const ref of s.references)
            try {
              const e = await repository(loc.base).getExercise(ref.id);
              for (const p of ref.versions?.items ?? []) {
                const n = p.value;
                if (
                  n instanceof Scalar &&
                  n.value !== "" &&
                  !Object.hasOwn(e.varianti, String(n.value))
                )
                  add(
                    "Variante inesistente: " + String(n.value),
                    vscode.DiagnosticSeverity.Error,
                    range(doc, n),
                  );
              }
            } catch (e) {
              add(
                errorMessage(e),
                vscode.DiagnosticSeverity.Error,
                range(doc, ref.node),
              );
            }
          if (!diagnostics.length) {
            const snapshot = await repository(loc.base).snapshot(
                doc.uri.fsPath,
              ),
              v = validate(snapshot.exam, snapshot.library);
            v.errors.forEach((e) => add(e));
            v.warnings.forEach((w) =>
              add(w, vscode.DiagnosticSeverity.Warning),
            );
          }
        }
      } catch (e) {
        add(errorMessage(e));
      }
    if (this.pending.get(key) === generation)
      this.diagnostics.set(doc.uri, diagnostics);
  }
  register() {
    const c = this.context.subscriptions;
    c.push(this, vscode.languages.registerCodeLensProvider(selector, this));
    c.push(
      vscode.languages.registerDefinitionProvider(selector, {
        provideDefinition: async (doc, pos) => {
          const loc = locate(doc.uri);
          if (loc?.kind !== "verifiche") return;
          const at = doc.offsetAt(pos);
          try {
            for (const r of structure(doc.getText()).references) {
              const file = exercisePath(loc.base, r.id);
              if (r.node.range![0] <= at && at <= r.node.range![1])
                return new vscode.Location(
                  vscode.Uri.file(file),
                  new vscode.Position(0, 0),
                );
              for (const pair of r.versions?.items ?? []) {
                const n = pair.value as Scalar;
                if (n?.range && n.range[0] <= at && at <= n.range[1]) {
                  const target = await vscode.workspace.openTextDocument(
                    vscode.Uri.file(file),
                  );
                  const variant = variants(target.getText()).find(
                    (v) => v.id === n.value,
                  );
                  if (variant)
                    return new vscode.Location(
                      target.uri,
                      target.positionAt(variant.start),
                    );
                }
              }
            }
          } catch {
            return;
          }
        },
      }),
    );
    c.push(
      vscode.languages.registerCompletionItemProvider(
        selector,
        {
          provideCompletionItems: async (doc, pos) => {
            const loc = locate(doc.uri);
            if (loc?.kind !== "verifiche") return;
            const line = doc.lineAt(pos).text;
            const items: vscode.CompletionItem[] = [];
            try {
              const at = doc.offsetAt(pos),
                s = structure(doc.getText());
              const ref = s.references.find(
                (r) => r.node.range![0] <= at && at <= r.node.range![1],
              );
              if (ref) {
                for (const file of await enumerate(
                  path.join(loc.base, "esercizi"),
                  /\.md$/i,
                )) {
                  const id = relativeId(path.join(loc.base, "esercizi"), file),
                    item = new vscode.CompletionItem(
                      id,
                      vscode.CompletionItemKind.File,
                    );
                  item.range = range(doc, ref.node);
                  item.insertText = JSON.stringify(id);
                  items.push(item);
                }
                return items;
              }
              const usage = s.references
                .filter(
                  (r) =>
                    r.block.node.range![0] <= at &&
                    at <= r.block.node.range![2],
                )
                .at(-1);
              if (usage?.versions) {
                for (const pair of usage.versions.items) {
                  const n = pair.value as Scalar;
                  if (n?.range && n.range[0] <= at && at <= n.range[1]) {
                    const e = await repository(loc.base).getExercise(usage.id);
                    return ["", ...Object.keys(e.varianti)].map((id) => {
                      const item = new vscode.CompletionItem(
                        id || "Nessuna assegnazione",
                        vscode.CompletionItemKind.Value,
                      );
                      item.insertText = JSON.stringify(id);
                      item.range = range(doc, n);
                      return item;
                    });
                  }
                }
              }
            } catch {
              /* Incomplete YAML below uses a narrow line-based fallback. */
            }
            if (
              /^\s*(?:-\s*)?(?:id|esercizio):\s*[^\s]*$/.test(line) &&
              /esercizio:/.test(doc.getText())
            )
              for (const file of await enumerate(
                path.join(loc.base, "esercizi"),
                /\.md$/i,
              )) {
                const id = relativeId(path.join(loc.base, "esercizi"), file);
                items.push(
                  new vscode.CompletionItem(id, vscode.CompletionItemKind.File),
                );
              }
            return items;
          },
        },
        "/",
        ":",
        " ",
      ),
    );
    c.push(
      vscode.languages.registerCodeActionsProvider(selector, {
        provideCodeActions: (doc, r) => {
          const loc = locate(doc.uri);
          if (!loc) return [];
          const make = (title: string, command: string, args: any[]) => {
            const a = new vscode.CodeAction(
              title,
              vscode.CodeActionKind.Refactor,
            );
            a.command = {
              title,
              command: "verifiche." + command,
              arguments: [doc.uri, ...args],
            };
            return a;
          };
          if (!doc.getText().trim())
            return [make("Inserisci template", "template", [])];
          if (loc.kind === "verifiche")
            return [
              make("Inserisci blocco prima", "addBlock", [
                doc.offsetAt(r.start),
                "before",
              ]),
              make("Inserisci blocco dopo", "addBlock", [
                doc.offsetAt(r.start),
                "after",
              ]),
              make("Scegli variante", "chooseVariant", [doc.offsetAt(r.start)]),
            ];
          return [];
        },
      }),
    );
    c.push(
      vscode.languages.registerReferenceProvider(selector, {
        provideReferences: async (doc, pos, _ctx, token) => {
          const loc = locate(doc.uri);
          if (!loc) return [];
          let id = loc.id,
            variant: string | undefined;
          if (loc.kind === "esercizi") {
            const at = doc.offsetAt(pos);
            variant = variants(doc.getText()).find(
              (v) => v.nameStart <= at && at <= v.nameStart + v.id.length,
            )?.id;
          } else {
            const at = doc.offsetAt(pos),
              r = structure(doc.getText()).references.find(
                (r) => r.node.range![0] <= at && at <= r.node.range![1],
              );
            if (!r) return [];
            id = r.id;
          }
          const results: vscode.Location[] = [];
          for (const file of await enumerate(
            path.join(loc.base, "verifiche"),
            /\.ya?ml$/i,
          )) {
            if (token.isCancellationRequested) return [];
            const d = await vscode.workspace.openTextDocument(
              vscode.Uri.file(file),
            );
            try {
              for (const r of structure(d.getText()).references.filter(
                (r) => r.id === id,
              )) {
                if (variant) {
                  for (const p of r.versions?.items ?? [])
                    if ((p.value as Scalar)?.value === variant)
                      results.push(
                        new vscode.Location(d.uri, range(d, p.value)),
                      );
                } else
                  results.push(new vscode.Location(d.uri, range(d, r.node)));
              }
            } catch {
              /* Invalid documents still have their own diagnostics. */
            }
          }
          return results;
        },
      }),
    );
    c.push(
      vscode.workspace.onWillRenameFiles((event) =>
        event.waitUntil(this.renameFiles(event.files)),
      ),
    );
    const transfer = new Transfers();
    c.push(
      vscode.languages.registerDocumentDropEditProvider(selector, transfer, {
        dropMimeTypes: ["text/uri-list", "image/*", "files"],
      }),
    );
    c.push(
      vscode.languages.registerDocumentPasteEditProvider(selector, transfer, {
        pasteMimeTypes: ["image/*", "text/uri-list"],
        providedPasteEditKinds: [Transfers.imageKind],
      }),
    );
  }
  async renameFiles(
    files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[],
  ) {
    const edit = new vscode.WorkspaceEdit();
    const roots = new Set<string>();
    for (const f of files) {
      for (const candidate of [
        f.oldUri,
        vscode.Uri.joinPath(f.oldUri, "placeholder.md"),
      ]) {
        const l = locate(candidate);
        if (l?.kind === "esercizi") roots.add(l.base);
      }
    }
    const versions = new Map<vscode.TextDocument, number>(),
      skipped: string[] = [];
    for (const base of roots)
      for (const file of await enumerate(
        path.join(base, "verifiche"),
        /\.ya?ml$/i,
      )) {
        const source = await readDocument(file);
        let refs;
        try {
          refs = structure(source).references;
        } catch {
          skipped.push(path.basename(file));
          continue;
        }
        const patches = [];
        for (const ref of refs) {
          const old = exercisePath(base, ref.id);
          for (const f of files) {
            const rel = path.relative(f.oldUri.fsPath, old);
            if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
            const next = path.join(f.newUri.fsPath, rel),
              loc = locate(vscode.Uri.file(next));
            if (!loc || loc.kind !== "esercizi" || loc.base !== base) {
              void vscode.window.showWarningMessage(
                "Spostamento fuori dalla cartella esercizi: i riferimenti non possono essere aggiornati.",
              );
              continue;
            }
            patches.push(scalarPatch(ref.node, loc.id));
            break;
          }
        }
        if (patches.length) {
          const doc = await vscode.workspace.openTextDocument(
            vscode.Uri.file(file),
          );
          if (doc.getText() !== source)
            throw Error("Verifica cambiata durante la rinomina: " + file);
          versions.set(doc, doc.version);
          addPatches(edit, doc, patches);
        }
      }
    if (skipped.length)
      void vscode.window.showWarningMessage(
        "Riferimenti non verificabili nei file YAML con errori: " +
          skipped.join(", ") +
          ". Correggerli e controllare i riferimenti.",
      );
    for (const [doc, version] of versions)
      if (doc.version !== version)
        throw Error("Documento cambiato durante la rinomina");
    return edit;
  }
}

export class Transfers
  implements vscode.DocumentDropEditProvider, vscode.DocumentPasteEditProvider
{
  static imageKind = vscode.DocumentDropOrPasteEditKind.Empty.append(
    "verifiche",
    "image",
  );
  async image(doc: vscode.TextDocument, data: vscode.DataTransfer) {
    const loc = locate(doc.uri);
    if (loc?.kind !== "esercizi") return;
    let bytes: Uint8Array | undefined,
      uri: vscode.Uri | undefined,
      name = "immagine.png";
    for (const [mime, item] of data) {
      const file = item.asFile();
      if (
        file &&
        (mime.startsWith("image/") ||
          /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name))
      ) {
        bytes = await file.data();
        uri = file.uri;
        name = file.name || name;
        break;
      }
    }
    if (!bytes) {
      const list = await data.get("text/uri-list")?.asString();
      for (const text of list
        ?.split(/\r?\n/)
        .filter((l) => l && !l.startsWith("#")) ?? []) {
        const candidate = vscode.Uri.parse(text);
        if (
          candidate.scheme === "file" &&
          /\.(png|jpe?g|gif|webp|svg)$/i.test(candidate.path)
        ) {
          uri = candidate;
          name = path.basename(uri.fsPath);
          bytes = await vscode.workspace.fs.readFile(uri);
          break;
        }
      }
    }
    if (!bytes) return;
    const extra = new vscode.WorkspaceEdit();
    let dest: vscode.Uri;
    const rel = uri
      ? path.relative(path.join(loc.base, "allegati"), uri.fsPath)
      : "..";
    if (uri && rel && !rel.startsWith("..") && !path.isAbsolute(rel))
      dest = uri;
    else {
      const ext = /\.(png|jpe?g|gif|webp|svg)$/i.exec(name)?.[0] ?? ".png";
      const stem =
        path.basename(name, path.extname(name)).replace(/[^\w-]/g, "-") ||
        "immagine";
      dest = vscode.Uri.file(
        path.join(
          loc.base,
          "allegati",
          `${stem}-${crypto.randomUUID().slice(0, 8)}${ext}`,
        ),
      );
      extra.createFile(dest, { overwrite: false, contents: bytes });
    }
    const relative = path
      .relative(path.join(loc.base, "allegati"), dest.fsPath)
      .split(path.sep)
      .map(encodeURIComponent)
      .join("/");
    return { text: `![Immagine](/allegati/${relative})`, extra };
  }
  async provideDocumentDropEdits(
    doc: vscode.TextDocument,
    pos: vscode.Position,
    data: vscode.DataTransfer,
    token: vscode.CancellationToken,
  ) {
    const loc = locate(doc.uri);
    if (!loc) return;
    const version = doc.version;
    if (loc.kind === "esercizi") {
      const image = await this.image(doc, data);
      if (!image || token.isCancellationRequested || version !== doc.version)
        return;
      const edit = new vscode.DocumentDropEdit(image.text);
      edit.title = "Inserisci immagine negli allegati";
      edit.kind = Transfers.imageKind;
      edit.additionalEdit = image.extra;
      return edit;
    }
    const list = await data.get("text/uri-list")?.asString();
    if (!list) return;
    const uri = vscode.Uri.parse(
      list.split(/\r?\n/).find((l) => l && !l.startsWith("#")) ?? "",
    );
    const source = locate(uri);
    if (!source || source.kind !== "esercizi" || source.base !== loc.base)
      return;
    const at = doc.offsetAt(pos),
      block = blockAt(doc.getText(), at);
    let side = "after";
    if (block?.node.has("gruppo")) {
      const choice = await vscode.window.showQuickPick(
        [
          { label: "Dentro il gruppo", value: "inside" },
          { label: "Prima del gruppo", value: "before" },
          { label: "Dopo il gruppo", value: "after" },
        ],
        { title: "Inserisci esercizio" },
      );
      if (!choice) return;
      side = choice.value;
    }
    const patch = await exerciseInsertion(doc, at, source.id, false, side);
    if (token.isCancellationRequested || version !== doc.version) return;
    const edit = new vscode.DocumentDropEdit("");
    edit.title = "Inserisci esercizio nella verifica";
    edit.kind = vscode.DocumentDropOrPasteEditKind.Empty.append(
      "verifiche",
      "exercise",
    );
    edit.additionalEdit = new vscode.WorkspaceEdit();
    addPatches(edit.additionalEdit, doc, [patch]);
    return edit;
  }
  async provideDocumentPasteEdits(
    doc: vscode.TextDocument,
    _ranges: readonly vscode.Range[],
    data: vscode.DataTransfer,
    _context: vscode.DocumentPasteEditContext,
    token: vscode.CancellationToken,
  ) {
    const version = doc.version,
      image = await this.image(doc, data);
    if (!image || token.isCancellationRequested || doc.version !== version)
      return;
    const edit = new vscode.DocumentPasteEdit(
      image.text,
      "Inserisci immagine negli allegati",
      Transfers.imageKind,
    );
    edit.additionalEdit = image.extra;
    return [edit];
  }
}
