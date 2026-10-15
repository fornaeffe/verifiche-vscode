import * as vscode from "vscode";
import path from "node:path";
import { YAMLMap, Scalar } from "yaml";
import {
  structure,
  insertion,
  exerciseBlockInsertion,
  assignments,
  examTemplate,
  traceEdit,
  variants,
  scalarPatch,
  mapSet,
  Patch,
  eol,
} from "./document";
import {
  exerciseTemplate,
  exerciseTemplates,
  ExerciseTemplateType,
} from "./templates";
import {
  locate,
  target,
  offset,
  apply,
  repository,
  addPatches,
  readDocument,
  errorMessage,
  settings,
} from "./host";
import { enumerate, exercisePath, relativeId } from "./repository";
import { Preview } from "./preview";
import { exportPDF } from "./pdf";
import { validate, exercise, content, type Exercise } from "./core";
import { spawn } from "node:child_process";

export async function exerciseInsertion(
  doc: vscode.TextDocument,
  at: number,
  id: string,
  empty = false,
  side = "after",
) {
  const loc = locate(doc.uri)!;
  const source = doc.getText(),
    v = structure(source).doc.toJS();
  const e = empty
    ? { varianti: {}, variantOrder: [] }
    : await repository(loc.base).getExercise(id);
  return exerciseBlockInsertion(
    source,
    at,
    {
      id,
      versioni: assignments(v.tracce, e.varianti, empty, e.variantOrder),
    },
    vscode.workspace
      .getConfiguration("verifiche", doc.uri)
      .get<boolean>("defaultExercisePoints", true),
    side,
  );
}
async function selectTrace(doc: vscode.TextDocument, given?: string) {
  if (given) return given;
  const traces = structure(doc.getText()).doc.toJS().tracce;
  const items: vscode.QuickPickItem[] = traces.map((t: any) => ({
    label: String(t.id),
    description: t.etichetta,
  }));
  return (await vscode.window.showQuickPick(items, { title: "Traccia" }))
    ?.label;
}
async function variantName(doc: vscode.TextDocument, given?: string) {
  return (
    given ??
    (await vscode.window.showQuickPick(
      variants(doc.getText()).map((v) => v.id),
      { title: "Variante" },
    ))
  );
}
async function newName(title: string, existing: string[]) {
  return vscode.window.showInputBox({
    title,
    validateInput: (s) =>
      !s ||
      !/^[\w-]+$/.test(s) ||
      [
        "default",
        "__proto__",
        "constructor",
        "prototype",
        ...existing,
      ].includes(s)
        ? "Nome non valido o già presente"
        : undefined,
  });
}

export function registerCommands(
  context: vscode.ExtensionContext,
  preview: Preview,
) {
  const register = (name: string, fn: (...args: any[]) => unknown) =>
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "verifiche." + name,
        async (...args: any[]) => {
          try {
            return await fn(...args);
          } catch (e) {
            void vscode.window.showErrorMessage(errorMessage(e));
          }
        },
      ),
    );
  register("insertChemicalFormula", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !locate(editor.document.uri)) return;
    const snippet = new vscode.SnippetString();
    snippet.appendText("$\\ce{").appendTabstop(0).appendText("}$");
    await editor.insertSnippet(snippet);
  });
  register("preview", async (uri?: vscode.Uri) =>
    preview.show(await target(uri), true),
  );
  register(
    "template",
    async (uri?: vscode.Uri, type?: ExerciseTemplateType) => {
      const doc = await target(uri),
        loc = locate(doc.uri)!;
      if (doc.getText().trim())
        throw Error("Il template richiede un file vuoto");
      const source =
        loc.kind === "verifiche"
          ? examTemplate(
              path.basename(doc.uri.fsPath).replace(/\.ya?ml$/i, ""),
              settings(doc.uri).traceIds(),
            )
          : exerciseTemplate(
              path.basename(doc.uri.fsPath, ".md"),
              type ?? "A",
              settings(doc.uri).variantName(),
            );
      await apply(doc, doc.version, [
        {
          start: 0,
          end: doc.getText().length,
          text: source.replace(
            /\r?\n/g,
            doc.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n",
          ),
        },
      ]);
      await vscode.window.showTextDocument(doc);
      await preview.show(doc, true);
    },
  );
  register(
    "addBlock",
    async (uri?: vscode.Uri, given?: number, side = "after") => {
      const doc = await target(uri),
        loc = locate(doc.uri)!;
      if (loc.kind !== "verifiche") return;
      const version = doc.version,
        at = offset(doc, given);
      const kind = await vscode.window.showQuickPick(
        ["Esercizio", "Gruppo", "Istruzioni", "Contenuto", "Salto pagina"],
        { title: "Inserisci blocco" },
      );
      if (!kind) return;
      let patch: Patch,
        created: vscode.Uri | undefined,
        extra: vscode.WorkspaceEdit | undefined;
      if (kind === "Esercizio") {
        const files = await enumerate(
          path.join(loc.base, "esercizi"),
          /\.md$/i,
        );
        const items = [
          { label: "$(new-file) Nuovo esercizio…", file: "" },
          ...files.map((file) => ({
            label: relativeId(path.join(loc.base, "esercizi"), file),
            file,
          })),
        ];
        const picked = await vscode.window.showQuickPick(items, {
          title: "Esercizio",
          matchOnDescription: true,
        });
        if (!picked) return;
        let id: string;
        if (!picked.file) {
          const defaults = settings(doc.uri);
          const fileName = defaults.exerciseFileName();
          const variantName = defaults.variantName();
          created = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(
              path.join(loc.base, "esercizi", fileName),
            ),
            filters: { Esercizio: ["md"] },
            title: "Crea esercizio",
          });
          if (!created) return;
          const destination = locate(created);
          if (
            !destination ||
            destination.kind !== "esercizi" ||
            destination.base !== loc.base
          )
            throw Error(
              "Scegliere un file .md nella cartella esercizi di questa verifica",
            );
          id = destination.id;
          extra = new vscode.WorkspaceEdit();
          extra.createFile(created, {
            overwrite: false,
            contents: Buffer.from(
              exerciseTemplate(path.basename(id), "A", variantName),
            ),
          });
        } else id = relativeId(path.join(loc.base, "esercizi"), picked.file);
        patch = await exerciseInsertion(doc, at, id, !!created, side);
      } else {
        const value =
          kind === "Gruppo"
            ? { gruppo: { istruzioni: "", esercizi: [] } }
            : kind === "Istruzioni"
              ? { istruzioni: { testo: "" } }
              : kind === "Contenuto"
                ? { contenuto: { testo: "" } }
                : { salto_pagina: true };
        patch = insertion(doc.getText(), at, value, side);
      }
      await apply(doc, version, [patch], extra);
      if (created) await vscode.window.showTextDocument(created);
      else {
        const editor = await vscode.window.showTextDocument(doc);
        editor.selection = new vscode.Selection(
          doc.positionAt(patch.start),
          doc.positionAt(patch.start),
        );
      }
    },
  );
  for (const kind of ["add", "delete", "rename", "duplicate"] as const)
    register(kind + "Trace", async (uri?: vscode.Uri, given?: string) => {
      const doc = await target(uri),
        version = doc.version,
        source = doc.getText(),
        s = structure(source);
      const existing = s.doc.toJS().tracce.map((t: any) => String(t.id));
      const exercises = new Map<string, Exercise>();
      let id: string | undefined, next: string | undefined;
      if (kind === "add") {
        let n = 1;
        while (existing.includes(String(n))) n++;
        id = String(n);
        const repo = repository(locate(doc.uri)!.base);
        for (const exerciseId of new Set(s.references.map((r) => r.id))) {
          try {
            exercises.set(exerciseId, await repo.getExercise(exerciseId));
          } catch (e) {
            throw Error(`Esercizio ${exerciseId}: ${errorMessage(e)}`);
          }
        }
      } else {
        id = await selectTrace(doc, given);
        if (!id) return;
      }
      if (
        kind === "delete" &&
        (await vscode.window.showWarningMessage(
          `Eliminare la traccia ${id} e le sue associazioni?`,
          { modal: true },
          "Elimina",
        )) !== "Elimina"
      )
        return;
      if (kind === "rename" || kind === "duplicate") {
        next = await newName("Nome nuova traccia", existing);
        if (!next) return;
      }
      await apply(doc, version, traceEdit(source, kind, id, next, exercises));
    });
  register(
    "chooseVariant",
    async (uri?: vscode.Uri, given?: number, givenTrace?: string) => {
      const doc = await target(uri),
        s = structure(doc.getText()),
        at = offset(doc, given);
      const ref =
        s.references.find((r) => r.node.range?.[0] === given) ??
        s.references
          .filter(
            (r) => r.block.node.range![0] <= at && at <= r.block.node.range![2],
          )
          .at(-1);
      if (!ref) throw Error("Posizionare il cursore in un blocco esercizio");
      const trace = givenTrace ?? (await selectTrace(doc));
      if (trace) await preview.choose(doc, ref.node.range![0], trace);
    },
  );
  register("addVariant", async (uri?: vscode.Uri) => {
    const doc = await target(uri),
      version = doc.version;
    const name = await newName(
      "Nome variante",
      variants(doc.getText()).map((v) => v.id),
    );
    if (!name) return;
    const nl = eol(doc.getText());
    await apply(doc, version, [
      {
        start: doc.getText().length,
        end: doc.getText().length,
        text: `${nl}:::variante ${name}${nl}${nl}:::${nl}`,
      },
    ]);
  });
  register("duplicateVariant", async (uri?: vscode.Uri, given?: string) => {
    const doc = await target(uri),
      version = doc.version,
      id = await variantName(doc, given);
    if (!id) return;
    const list = variants(doc.getText()),
      original = list.find((v) => v.id === id)!,
      name = await newName(
        "Nome variante duplicata",
        list.map((v) => v.id),
      );
    if (!name) return;
    const nl = eol(doc.getText());
    await apply(doc, version, [
      {
        start: original.end,
        end: original.end,
        text: `${nl}${nl}:::variante ${name}${nl}${original.body}:::`,
      },
    ]);
  });
  register("renameVariant", async (uri?: vscode.Uri, given?: string) => {
    const doc = await target(uri),
      loc = locate(doc.uri)!,
      version = doc.version,
      id = await variantName(doc, given);
    if (!id) return;
    const list = variants(doc.getText()),
      old = list.find((v) => v.id === id)!,
      name = await newName(
        "Nuovo nome variante",
        list.map((v) => v.id),
      );
    if (!name) return;
    const edit = new vscode.WorkspaceEdit(),
      versions = new Map<vscode.TextDocument, number>();
    for (const file of await enumerate(
      path.join(loc.base, "verifiche"),
      /\.ya?ml$/i,
    )) {
      const source = await readDocument(file),
        patches: Patch[] = [];
      for (const r of structure(source).references.filter(
        (r) => r.id === loc.id,
      ))
        for (const pair of r.versions?.items ?? []) {
          const n = pair.value;
          if (n instanceof Scalar && n.value === id)
            patches.push(scalarPatch(n, name));
        }
      if (patches.length) {
        const examDoc = await vscode.workspace.openTextDocument(
          vscode.Uri.file(file),
        );
        if (examDoc.getText() !== source)
          throw Error("Verifica cambiata durante la scansione");
        versions.set(examDoc, examDoc.version);
        addPatches(edit, examDoc, patches);
      }
    }
    for (const [d, v] of versions)
      if (d.version !== v)
        throw Error("Verifica cambiata durante la ricerca degli utilizzi");
    await apply(
      doc,
      version,
      [{ start: old.nameStart, end: old.nameStart + id.length, text: name }],
      edit,
    );
  });
  const pdf = async (all: boolean) => {
    const doc = preview.document ?? (await target());
    const loc = locate(doc.uri)!;
    if (loc.kind !== "verifiche")
      throw Error("Aprire una verifica per esportare");
    const outputRoot = settings(doc.uri).outputDirectory(loc.root);
    const s = await repository(loc.base).snapshot(doc.uri.fsPath);
    const trace = preview.currentTrace(doc) ?? String(s.exam.tracce[0].id);
    const files = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Esportazione PDF",
      },
      () =>
        exportPDF(
          s,
          all ? s.exam.tracce.map((t: any) => String(t.id)) : [trace],
          context.asAbsolutePath("dist"),
          outputRoot,
        ),
    );
    void vscode.window
      .showInformationMessage(`${files.length} PDF generati`, "Apri cartella")
      .then((action) => {
        if (action)
          return vscode.commands.executeCommand(
            "revealFileInOS",
            vscode.Uri.file(files[0]),
          );
      });
    return files;
  };
  register("export", () => pdf(false));
  register("exportAll", () => pdf(true));
  preview.onExport = (all) =>
    void pdf(all).catch((e) => vscode.window.showErrorMessage(errorMessage(e)));
  register("installBrowser", () =>
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Installazione Chromium",
      },
      () =>
        new Promise<void>((resolve, reject) => {
          const child = spawn(
            process.execPath,
            [
              context.asAbsolutePath("dist/node_modules/playwright/cli.js"),
              "install",
              "chromium",
            ],
            {
              env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
              windowsHide: true,
            },
          );
          let error = "";
          child.stderr.on("data", (d) => (error += d));
          child.on("error", reject);
          child.on("exit", (code) =>
            code === 0
              ? resolve()
              : reject(Error(error || "Installazione non riuscita")),
          );
        }),
    ),
  );
  register("validate", async () => {
    const doc = await target(),
      loc = locate(doc.uri)!;
    const channel = vscode.window.createOutputChannel("Verifiche — controllo");
    context.subscriptions.push(channel);
    channel.show(true);
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Controllo contenuti",
        cancellable: true,
      },
      async (_p, token) => {
        for (const file of await enumerate(
          path.join(loc.base, "esercizi"),
          /\.md$/i,
        )) {
          if (token.isCancellationRequested) return;
          try {
            const e = exercise(
              await readDocument(file),
              relativeId(path.join(loc.base, "esercizi"), file),
            );
            for (const value of Object.values(e.varianti))
              content(value, e.tipo, !!e.origine);
          } catch (e) {
            channel.appendLine(file + ": " + errorMessage(e));
          }
        }
        for (const file of await enumerate(
          path.join(loc.base, "verifiche"),
          /\.ya?ml$/i,
        )) {
          if (token.isCancellationRequested) return;
          try {
            const s = await repository(loc.base).snapshot(file);
            channel.appendLine(
              path.basename(file) +
                ": " +
                JSON.stringify(validate(s.exam, s.library)),
            );
          } catch (e) {
            channel.appendLine(file + ": " + errorMessage(e));
          }
        }
      },
    );
  });
}
