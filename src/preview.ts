import * as vscode from "vscode";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { content, esc, exercise, render, validate, safe } from "./core";
import { variants, structure, mapSet } from "./document";
import { locate, repository, apply, errorMessage, Location } from "./host";
import { Snapshot, exercisePath } from "./repository";
import { Dependencies } from "./dependencies";

export class Preview {
  panel?: vscode.WebviewPanel;
  document?: vscode.TextDocument;
  snapshot?: Snapshot;
  traces = new Map<string, string>();
  private generation = 0;
  private katexCss?: string;
  private dependencies?: Dependencies;
  private picker?: {
    doc: vscode.TextDocument;
    version: number;
    refStart: number;
    trace: string;
    id: string;
    ids: Set<string>;
  };
  onExport?: (all: boolean) => void;
  constructor(private context: vscode.ExtensionContext) {}
  dispose() {
    this.panel?.dispose();
  }
  dependsOn(uri: vscode.Uri) {
    return !!this.panel && !!this.dependencies?.affects(uri.fsPath);
  }
  get revision() {
    return this.generation;
  }
  async show(doc: vscode.TextDocument, force = false) {
    if (!locate(doc.uri)) return;
    if (this.picker && this.picker.doc !== doc) this.picker = undefined;
    if (this.picker) return;
    this.document = doc;
    if (
      !this.panel &&
      !force &&
      !vscode.workspace
        .getConfiguration("verifiche", doc.uri)
        .get("autoPreview", true)
    )
      return;
    this.ensure();
    await this.refresh();
  }
  private ensure() {
    if (this.panel) return;
    this.panel = vscode.window.createWebviewPanel(
      "verifiche.preview",
      "Anteprima verifiche",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          this.context.extensionUri,
          ...(vscode.workspace.workspaceFolders ?? []).map((f) => f.uri),
        ],
      },
    );
    this.panel.onDidDispose(() => {
      this.panel = undefined;
      this.picker = undefined;
      this.dependencies = undefined;
      this.snapshot = undefined;
      this.generation++;
    });
    this.panel.webview.onDidReceiveMessage(async (m) => {
      try {
        if (m.type === "trace" && this.document && !this.picker) {
          this.traces.set(this.document.uri.toString(), String(m.value));
          await this.refresh();
        } else if (m.type === "export" && !this.picker)
          this.onExport?.(!!m.all);
        else if (m.type === "cancel" && this.picker) {
          const doc = this.picker.doc;
          this.picker = undefined;
          await this.show(doc, true);
        } else if (m.type === "variant" && this.picker) {
          const p = this.picker;
          if (!p.ids.has(m.value)) return;
          if (p.doc.version !== p.version)
            throw Error(
              "Associazione cambiata durante la scelta. Riaprire il selettore.",
            );
          const ref = structure(p.doc.getText()).references.find(
            (r) => r.node.range?.[0] === p.refStart,
          );
          if (!ref) throw Error("Associazione non trovata");
          const edits = [
            ref.versions
              ? mapSet(p.doc.getText(), ref.versions, p.trace, m.value)
              : mapSet(p.doc.getText(), ref.usage, "versioni", {
                  [p.trace]: m.value,
                }),
          ];
          await apply(p.doc, p.version, edits);
          this.picker = undefined;
          await this.show(p.doc, true);
        }
      } catch (e) {
        void vscode.window.showErrorMessage(errorMessage(e));
      }
    });
  }
  currentTrace(doc = this.document) {
    return doc ? this.traces.get(doc.uri.toString()) : undefined;
  }
  async choose(doc: vscode.TextDocument, refStart: number, trace: string) {
    const version = doc.version,
      ref = structure(doc.getText()).references.find(
        (r) => r.node.range?.[0] === refStart,
      );
    if (!ref) throw Error("Esercizio non trovato");
    this.document = doc;
    this.ensure();
    this.generation++;
    this.picker = {
      doc,
      version,
      refStart,
      trace,
      id: ref.id,
      ids: new Set(),
    };
    await this.refresh();
    this.panel!.reveal(vscode.ViewColumn.Beside, false);
  }
  async refresh() {
    if (!this.panel || !this.document) return;
    const generation = ++this.generation,
      doc = this.document,
      loc = locate(doc.uri)!,
      dependencies = new Dependencies(
        doc.uri.fsPath,
        path.join(loc.root, "stili/predefinito.css"),
      );
    this.dependencies = dependencies;
    this.snapshot = undefined;
    try {
      if (this.picker) {
        const picker = this.picker;
        dependencies.add(exercisePath(loc.base, picker.id));
        const e = await repository(loc.base).getExercise(picker.id);
        if (generation !== this.generation) return;
        const cards = e.variantOrder.map((id) => ({
          id,
          html: this.page(
            `<h2>${esc(id)}</h2><div class="${e.tipo.toLowerCase()}">${content(e.varianti[id], e.tipo, !!e.origine)}</div>`,
            loc,
            dependencies,
          ),
        }));
        picker.ids = new Set(["", ...Object.keys(e.varianti)]);
        this.setHtml(
          loc,
          `Scegli variante — ${picker.id} / ${picker.trace}`,
          cards,
          true,
        );
        return;
      }
      const cards: { id: string; html: string }[] = [];
      let controls = "",
        warnings: string[] = [];
      if (loc.kind === "esercizi") {
        this.snapshot = undefined;
        const e = exercise(doc.getText(), loc.id);
        for (const v of variants(doc.getText()))
          cards.push({
            id: v.id,
            html: this.page(
              `<h2>${esc(v.id)}</h2><div class="${e.tipo.toLowerCase()}">${content(v.body, e.tipo, !!e.origine)}</div>`,
              loc,
              dependencies,
            ),
          });
      } else {
        const s = await repository(loc.base).snapshot(
          doc.uri.fsPath,
          dependencies.add,
        );
        let trace = this.currentTrace(doc);
        if (!s.exam.tracce.some((t: any) => String(t.id) === trace))
          trace = String(s.exam.tracce[0].id);
        this.traces.set(doc.uri.toString(), trace!);
        const v = validate(s.exam, s.library, dependencies.add),
          result = render(s.exam, trace!, s.library, dependencies.add);
        warnings = v.warnings;
        cards.push({
          id: trace!,
          html: this.resources(result.html, loc, dependencies),
        });
        controls = `<select id="trace" aria-label="Traccia">${s.exam.tracce.map((t: any) => `<option value="${esc(t.id)}" ${String(t.id) === trace ? "selected" : ""}>${esc(t.etichetta ?? t.id)}</option>`).join("")}</select><button id="pdf">Esporta PDF</button><button id="all">Tutti i PDF</button>`;
        if (generation === this.generation) this.snapshot = s;
      }
      if (generation !== this.generation) return;
      this.setHtml(
        loc,
        path.basename(doc.uri.fsPath),
        cards,
        false,
        controls,
        warnings,
      );
    } catch (e) {
      if (generation === this.generation) {
        this.snapshot = undefined;
        if (this.picker) this.picker.ids.clear();
        this.setHtml(loc, "Anteprima non disponibile", [], !!this.picker, "", [
          errorMessage(e),
        ]);
      }
    }
  }
  private resources(html: string, loc: Location, dependencies: Dependencies) {
    const css = path.join(loc.root, "stili/predefinito.css");
    // srcdoc frames are isolated from VS Code's resource service worker. Embed only
    // the resources used by this preview; never expose file:// or external URLs.
    const katex = (this.katexCss ??= fs
      .readFileSync(
        this.context.asAbsolutePath("dist/katex/katex.min.css"),
        "utf8",
      )
      .replace(/src:([^;]+);/g, (all, value) => {
        const font = /url\((fonts\/[^)]+\.woff2)\)/.exec(value);
        return font
          ? `src:url(data:font/woff2;base64,${fs.readFileSync(this.context.asAbsolutePath("dist/katex/" + font[1])).toString("base64")}) format("woff2");`
          : all;
      }));
    const style = fs.readFileSync(
      fs.existsSync(css)
        ? css
        : this.context.asAbsolutePath("media/predefinito.css"),
      "utf8",
    );
    const mime: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    const attachments = /(["'])(?:\.\.\/)*\/?allegati\/([^"']+)\1/g;
    const files = new Map<string, string>();
    for (const match of html.matchAll(attachments)) {
      const file = safe(
        path.join(loc.base, "allegati"),
        decodeURIComponent(match[2]),
      );
      dependencies.add(file);
      files.set(match[2], file);
    }
    return html
      .replace(attachments, (_m, q, p) => {
        const file = files.get(p)!;
        return (
          q +
          `data:${mime[path.extname(file).toLowerCase()] ?? "application/octet-stream"};base64,${fs.readFileSync(file).toString("base64")}` +
          q
        );
      })
      .replace(
        '<link rel="stylesheet" href="/vendor/katex.min.css">',
        `<style>${katex}</style>`,
      )
      .replace(
        '<link rel="stylesheet" href="/stili/predefinito.css">',
        `<style>${style}</style>`,
      );
  }
  private page(body: string, loc: Location, dependencies: Dependencies) {
    return this.resources(
      `<!doctype html><html><head><link rel="stylesheet" href="/vendor/katex.min.css"><link rel="stylesheet" href="/stili/predefinito.css"><style>html{background:white;color:black}body{font:15px Arial,sans-serif!important;width:auto!important;max-width:none!important;margin:14px!important}h2{font-size:16px;margin-top:0}</style></head><body>${body}</body></html>`,
      loc,
      dependencies,
    );
  }
  private setHtml(
    loc: Location,
    title: string,
    cards: { id: string; html: string }[],
    picker: boolean,
    controls = "",
    warnings: string[] = [],
  ) {
    if (!this.panel) return;
    const web = this.panel.webview,
      nonce = crypto.randomBytes(18).toString("base64");
    const key = this.document?.uri.toString() ?? "";
    web.html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${web.cspSource} 'unsafe-inline'; img-src ${web.cspSource} data:; font-src ${web.cspSource} data:; frame-src 'self'; script-src 'nonce-${nonce}';"><style>
      body{font-family:var(--vscode-font-family);padding:12px;color:var(--vscode-foreground)}header{position:sticky;top:0;background:var(--vscode-editor-background);padding:8px 0;z-index:1}button,select{font:inherit;padding:6px;margin:3px;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:0;cursor:pointer}h1{font-size:15px}iframe{width:100%;height:600px;border:0;background:white;color:black}article{margin:12px 0;border:1px solid var(--vscode-panel-border)}.warning{color:var(--vscode-editorWarning-foreground)}
      </style></head><body><header><h1>${esc(title)}</h1>${picker ? '<button data-variant="">Nessuna assegnazione</button><button id="cancel">Annulla (Esc)</button>' : controls}</header>${warnings.map((w) => `<p class="warning">${esc(w)}</p>`).join("")}${cards.map((c) => `<article>${picker ? `<button data-variant="${esc(c.id)}">Usa ${esc(c.id)}</button>` : ""}<iframe sandbox="allow-same-origin" title="${esc(c.id)}" srcdoc="${esc(c.html)}"></iframe></article>`).join("")}
      <script nonce="${nonce}">const api=acquireVsCodeApi();const key=${JSON.stringify(key)};const state=api.getState()||{};const send=m=>api.postMessage(m);
      document.getElementById('trace')?.addEventListener('change',e=>send({type:'trace',value:e.target.value}));
      document.getElementById('pdf')?.addEventListener('click',()=>send({type:'export',all:false}));document.getElementById('all')?.addEventListener('click',()=>send({type:'export',all:true}));
      document.getElementById('cancel')?.addEventListener('click',()=>send({type:'cancel'}));document.addEventListener('keydown',e=>{if(e.key==='Escape')send({type:'cancel'});});
      document.querySelectorAll('[data-variant]').forEach(b=>b.addEventListener('click',()=>send({type:'variant',value:b.dataset.variant})));
      const fit=()=>document.querySelectorAll('iframe').forEach(f=>{const d=f.contentDocument;if(!d?.body)return;d.body.style.zoom=${loc.kind === "verifiche" && !picker ? "Math.min(1,f.clientWidth/750)" : "1"};f.style.height='1px';f.style.height=(Math.max(d.body.scrollHeight,d.documentElement.scrollHeight)+30)+'px';});
      document.querySelectorAll('iframe').forEach(f=>f.addEventListener('load',fit));setTimeout(fit,100);setTimeout(fit,500);window.addEventListener('resize',fit);
      window.scrollTo(0,state[key]||0);window.addEventListener('scroll',()=>{state[key]=window.scrollY;api.setState(state);});</script></body></html>`;
  }
}
