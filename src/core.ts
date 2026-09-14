import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import YAML from "yaml";
import MarkdownIt from "markdown-it";
import katex from "katex";
import "katex/contrib/mhchem";

export const types = ["A", "SM", "VF", "Etichettare", "Completamento"];
export const hash = (s: string | Buffer) =>
  crypto.createHash("sha256").update(s).digest("hex");
export const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function safe(base: string, relative: string) {
  const p = path.resolve(base, relative);
  if (p !== path.resolve(base) && !p.startsWith(path.resolve(base) + path.sep))
    throw Error("Percorso non consentito");
  return p;
}
export function files(dir: string): string[] {
  return fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) =>
          e.isDirectory()
            ? files(path.join(dir, e.name))
            : [path.join(dir, e.name)],
        )
    : [];
}
export function write(p: string, s: string | Buffer) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = p + "." + crypto.randomUUID() + ".tmp";
  fs.writeFileSync(tmp, s);
  fs.renameSync(tmp, p);
}
export interface Exercise {
  id: string;
  tipo: string;
  titolo?: string;
  varianti: Record<string, string>;
  variantOrder: string[];
  [key: string]: any;
}
export function exercise(source: string, filename = "esercizio.md"): Exercise {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw Error("Manca intestazione YAML fra ---");
  const meta = YAML.parse(match[1]);
  if (!meta || !types.includes(meta.tipo))
    throw Error("Tipo esercizio non valido");
  if (meta.id !== undefined)
    throw Error(
      "Rimuovere id dal front matter: usare la migrazione dei percorsi.",
    );
  const body = source.slice(match[0].length);
  const varianti: Record<string, string> = {};
  const variantOrder: string[] = [];
  let end = 0;
  for (const m of body.matchAll(
    /^:::variante\s+([^\s]+)\s*\r?\n([\s\S]*?)^:::\s*$/gm,
  )) {
    if (body.slice(end, m.index).trim())
      throw Error("Testo fuori da una variante");
    if (Object.hasOwn(varianti, m[1]))
      throw Error("Variante duplicata: " + m[1]);
    if (["__proto__", "constructor", "prototype"].includes(m[1]))
      throw Error("Nome variante riservato: " + m[1]);
    varianti[m[1]] = m[2].trim();
    variantOrder.push(m[1]);
    end = m.index! + m[0].length;
  }
  if (body.slice(end).trim()) throw Error("Delimitatori variante non validi");
  if (!Object.keys(varianti).length)
    throw Error("Inserire almeno una variante");
  return { ...meta, id: filename, varianti, variantOrder };
}
export function serializeExercise(e: Exercise) {
  const { varianti, variantOrder, id, ...meta } = e;
  return (
    "---\n" +
    YAML.stringify(meta) +
    "---\n\n" +
    Object.entries(varianti)
      .map(([id, text]) => `:::variante ${id}\n${text}\n:::\n`)
      .join("\n")
  );
}
export function exam(source: string) {
  const v = YAML.parse(source);
  if (
    !v ||
    !v.titolo ||
    !Array.isArray(v.tracce) ||
    !v.tracce.length ||
    !Array.isArray(v.blocchi)
  )
    throw Error("Verifica: richiesti titolo, tracce e blocchi");
  if (v.id !== undefined)
    throw Error(
      "L'ID della verifica deriva dal percorso del file: rimuovere il campo id",
    );
  const ids = v.tracce.map((t: any) => String(t.id));
  if (
    ids.some((id: string) => !id || id === "undefined" || id === "default") ||
    new Set(ids).size !== ids.length
  )
    throw Error("ID tracce mancanti o duplicati");
  if (typeof v.titolo !== "string") throw Error("Titolo non testuale");
  if (ids.some((id: string) => !/^[a-zA-Z0-9_-]+$/.test(id)))
    throw Error("ID traccia: usare lettere, numeri e trattini");
  if (
    v.tracce.filter((t: any) => t.pubblica === true).length > 1 ||
    v.tracce.some(
      (t: any) => t.pubblica !== undefined && typeof t.pubblica !== "boolean",
    )
  )
    throw Error("Indicare al massimo una traccia pubblica, con pubblica: true");
  const checkScore = (n: any) => {
    if (
      n !== undefined &&
      (typeof n !== "number" || !Number.isFinite(n) || n < 0)
    )
      throw Error("Punteggio non valido: " + n);
  };
  const checkVersions = (versions: any) => {
    if (
      !versions ||
      typeof versions !== "object" ||
      Array.isArray(versions) ||
      !Object.keys(versions).length
    )
      throw Error("La mappa versioni deve contenere almeno una assegnazione");
    for (const [key, value] of Object.entries(versions)) {
      if (key !== "default" && !ids.includes(key))
        throw Error("Mappa versioni: traccia inesistente " + key);
      if (typeof value !== "string")
        throw Error("Le versioni devono contenere nomi o testi, non numeri");
    }
  };
  const checkInstruction = (i: any) => {
    if (typeof i === "string") return;
    if (!i || typeof i !== "object" || Array.isArray(i))
      throw Error("Istruzione non valida");
    if (i.testo !== undefined && typeof i.testo !== "string")
      throw Error("Le istruzioni devono essere testo");
    if (i.versioni !== undefined) checkVersions(i.versioni);
    checkScore(i.punti);
  };
  const checkBlocks = (blocks: any[]) => {
    if (!Array.isArray(blocks))
      throw Error("Il gruppo deve contenere un elenco esercizi");
    for (const b of blocks) {
      if (
        !b ||
        typeof b !== "object" ||
        [
          "esercizio",
          "istruzioni",
          "gruppo",
          "salto_pagina",
          "contenuto",
        ].filter((k) => Object.hasOwn(b, k)).length !== 1
      )
        throw Error(
          "Ogni blocco deve essere un esercizio, istruzione, gruppo, contenuto o salto pagina",
        );
      if (b.esercizio !== undefined) {
        const u =
          typeof b.esercizio === "string"
            ? { ...b, id: b.esercizio }
            : b.esercizio;
        if (!u || typeof u.id !== "string" || !u.id)
          throw Error("Riferimento esercizio senza ID");
        checkVersions(u.versioni);
        checkScore(u.punti);
      } else if (b.gruppo !== undefined) {
        if (!b.gruppo || typeof b.gruppo !== "object")
          throw Error("Gruppo non valido");
        checkScore(b.gruppo.punti);
        checkInstruction(b.gruppo.istruzioni ?? "");
        checkBlocks(b.gruppo.esercizi);
      } else if (b.salto_pagina !== undefined) {
        if (b.salto_pagina !== true) throw Error("Usare salto_pagina: true");
      } else checkInstruction(b.istruzioni ?? b.contenuto);
    }
  };
  checkBlocks(v.blocchi);
  return v;
}
export interface Library {
  exercises: Map<string, Exercise>;
  base: string;
}
const md = new MarkdownIt({ html: true, breaks: false });
md.inline.ruler.before("escape", "formula", (state, silent) => {
  const start = state.pos;
  if (state.src[start] !== "$") return false;
  const double = state.src[start + 1] === "$";
  const delimiter = double ? "$$" : "$";
  const end = state.src.indexOf(delimiter, start + delimiter.length);
  if (end < 0) throw Error("Formula senza delimitatore di chiusura");
  if (!silent) {
    const token = state.push("math", "", 0);
    token.content = state.src.slice(start + delimiter.length, end);
    token.meta = { display: double };
  }
  state.pos = end + delimiter.length;
  return true;
});
md.renderer.rules.math = (tokens, index) =>
  katex.renderToString(tokens[index].content, {
    displayMode: tokens[index].meta.display,
    throwOnError: true,
  });
export function markdown(text: string) {
  return md.render(
    text.replace(
      /!\[([^\]]*)\]\(([^)]+)\)\{width=([\d.]+(?:mm|cm|px|%))(?: float=(left|right))?\}/g,
      (_, alt, src, width, float) =>
        `<img alt="${esc(alt)}" src="${esc(src)}" style="width:${width};${float ? "float:" + float : ""}">`,
    ),
  );
}
export function content(text: string, tipo = "A", legacy = false) {
  let html = markdown(text);
  if (["SM", "VF", "Etichettare"].includes(tipo)) {
    // Imported XML contains bare list items. Wrap these without altering nested lists.
    if (!/<(?:ul|ol)[\s>]/.test(html) && /<li[\s>]/.test(html)) {
      const a = html.indexOf("<li"),
        b = html.lastIndexOf("</li>") + 5;
      html =
        html.slice(0, a) + "<ul>" + html.slice(a, b) + "</ul>" + html.slice(b);
    }
    if (!/<(?:ul|ol)[\s>]/.test(html) && !legacy)
      throw Error(tipo + ": manca elenco di opzioni/affermazioni");
    let used = false;
    html = html.replace(
      /<(ul|ol)([^>]*)>([\s\S]*?)<\/\1>/g,
      (all, tag, attrs, inner) => {
        if (used) return all;
        used = true;
        if (tipo === "VF" || tipo === "Etichettare")
          inner = inner.replace(
            /<\/li>/g,
            `<span class="risposta">${tipo === "VF" ? "V ☐　F ☐" : "_______"}</span></li>`,
          );
        return `<ol class="opzioni" type="a"${attrs}>${inner}</ol>`;
      },
    );
  }
  return html;
}
export function uses(blocks: any[]): any[] {
  return blocks.flatMap((b) =>
    b.gruppo
      ? uses(b.gruppo.esercizi)
      : b.esercizio
        ? [
            typeof b.esercizio === "string"
              ? { ...b, id: b.esercizio }
              : b.esercizio,
          ]
        : [],
  );
}
export const resolve = (map: any, trace: string) =>
  map?.[trace] ?? map?.default;
function points(n: any) {
  if (n === undefined) return "";
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0)
    throw Error("Punteggio non valido: " + n);
  return `<span class="punti">[　　 punti su ${n.toLocaleString("it-IT")}]</span>`;
}
export function render(v: any, trace: string, lib: Library) {
  const t = v.tracce.find((t: any) => String(t.id) === trace);
  if (!t) throw Error("Traccia inesistente");
  let count = 0,
    total = 0;
  const order: string[] = [];
  const score = (n: any) => {
    const html = points(n);
    total += n ?? 0;
    return html;
  };
  const instruction = (i: any) => {
    if (typeof i === "string") return markdown(i);
    const text = resolve(i.versioni, trace) ?? i.testo;
    if (i.versioni && text === undefined)
      throw Error("Istruzioni: variante non risolta per " + trace);
    return markdown(text ?? "");
  };
  const blocks = (list: any[]): string =>
    list
      .map((b) => {
        if (b.contenuto) return instruction(b.contenuto);
        if (b.salto_pagina) return '<div class="page-break"></div>';
        if (b.gruppo)
          return `<div class="istruzioni">${score(b.gruppo.punti)}${instruction(b.gruppo.istruzioni ?? "")}</div>${blocks(b.gruppo.esercizi)}`;
        if (b.istruzioni !== undefined)
          return `<div class="istruzioni">${score(b.istruzioni.punti)}${instruction(b.istruzioni)}</div>`;
        if (b.esercizio) {
          const u =
            typeof b.esercizio === "string"
              ? { ...b, id: b.esercizio }
              : b.esercizio;
          const e = lib.exercises.get(u.id);
          if (!e) throw Error("Esercizio inesistente: " + u.id);
          const variant = resolve(u.versioni, trace);
          if (variant === "") return "";
          if (!Object.hasOwn(e.varianti, variant ?? ""))
            throw Error(
              `${u.id}, traccia ${trace}: variante non risolta (${variant})`,
            );
          order.push(u.id);
          return `<section class="esercizio ${e.tipo.toLowerCase()} ${esc(u.attributi?.class || "")}" ${u.attributi?.style ? `style="${esc(u.attributi.style)}"` : ""}><span class="numero">${++count}.</span>${score(u.punti)}${content(e.varianti[variant], e.tipo, !!e.origine)}</section>`;
        }
        throw Error("Blocco non riconosciuto");
      })
      .join("\n");
  let body = blocks(v.blocchi);
  body = body.replace(
    /(src|href)="(?:\.\.\/)*allegati\/([^"?#]+)"/g,
    '$1="/allegati/$2"',
  );
  for (const m of body.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi)) {
    if (!m[1].startsWith("/allegati/"))
      throw Error("Immagine: usare allegati locali: " + m[1]);
    if (
      !fs.existsSync(
        safe(
          path.join(lib.base, "allegati"),
          decodeURIComponent(m[1].slice(10)),
        ),
      )
    )
      throw Error("Allegato mancante: " + m[1]);
  }
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${esc(v.titolo)} — ${esc(trace)}</title><link rel="stylesheet" href="/vendor/katex.min.css"><link rel="stylesheet" href="/stili/predefinito.css"></head><body><div class="header"><span>Nome e cognome: ____________________</span><span>Classe: ______</span><span>Data: __________</span></div><h1>${esc(v.titolo)}</h1><div class="traccia">${esc(t.pubblica ? "Traccia di esempio" : t.etichetta || "Traccia " + trace)}</div>${body}<footer>Totale: ${total.toLocaleString("it-IT")} punti</footer></body></html>`;
  return { html, total, count, order };
}
export function validate(v: any, lib: Library) {
  const errors: string[] = [],
    warnings: string[] = [],
    tracce: any[] = [];
  for (const t of v.tracce) {
    for (const u of uses(v.blocchi)) {
      const e = lib.exercises.get(u.id),
        variant = resolve(u.versioni, String(t.id)),
        s = variant === "" ? undefined : e?.varianti[variant];
      if (
        s !== undefined &&
        (!s.trim() ||
          (["SM", "VF", "Etichettare"].includes(e!.tipo) &&
            !/<li[\s>]|^\s*[-*+] /m.test(s)))
      )
        warnings.push(
          `Traccia ${t.id}, ${u.id}: contenuto storico vuoto o privo di opzioni; verificare prima di stampare`,
        );
    }
    try {
      const { html, ...r } = render(v, String(t.id), lib);
      tracce.push({ id: String(t.id), ...r });
      if (new Set(r.order).size !== r.order.length)
        warnings.push(`Traccia ${t.id}: esercizi ripetuti`);
    } catch (e) {
      errors.push(String(e));
    }
  }
  if (new Set(tracce.map((t) => t.total)).size > 1)
    warnings.push("Totali diversi fra le tracce");
  return { errors, warnings, tracce };
}
