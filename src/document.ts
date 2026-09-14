import YAML, {
  isMap,
  isSeq,
  isScalar,
  YAMLMap,
  YAMLSeq,
  Scalar,
  Node,
} from "yaml";

export interface Patch {
  start: number;
  end: number;
  text: string;
}
export type KeyPath = (string | number)[];
export interface Block {
  node: YAMLMap;
  path: KeyPath;
  list: YAMLSeq;
  index: number;
}
export interface Reference {
  id: string;
  node: Scalar;
  usage: YAMLMap;
  block: Block;
  versions?: YAMLMap;
}
export function parsed(source: string) {
  const doc = YAML.parseDocument(source, { keepSourceTokens: true });
  if (doc.errors.length)
    throw Error(doc.errors.map((e) => e.message).join("\n"));
  return doc;
}
export const eol = (source: string) =>
  source.includes("\r\n") ? "\r\n" : "\n";
export const startLine = (s: string, offset: number) =>
  s.lastIndexOf("\n", offset - 1) + 1;
export const endLine = (s: string, offset: number) => {
  const n = s.indexOf("\n", offset);
  return n < 0 ? s.length : n + 1;
};
const column = (s: string, n: number) => n - startLine(s, n);
export function applyPatches(source: string, patches: Patch[]) {
  const ordered = patches
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => b.start - a.start || b.i - a.i);
  let limit = source.length + 1;
  for (const p of ordered) {
    if (p.end > limit || p.start > p.end)
      throw Error("Modifiche sovrapposte: ricalcolare il documento.");
    source = source.slice(0, p.start) + p.text + source.slice(p.end);
    limit = p.start;
  }
  return source;
}
export function scalarPatch(node: Scalar, value: string): Patch {
  if (!node.range) throw Error("Posizione del valore non disponibile");
  return {
    start: node.range[0],
    end: node.range[1],
    text: JSON.stringify(value),
  };
}
function rendered(value: unknown) {
  return YAML.stringify(value, { lineWidth: 0 }).trimEnd();
}
export function replaceNode(source: string, node: any, value: unknown): Patch {
  const indent = column(source, node.range[0]);
  const trailing = source.slice(node.range[0], node.range[1]).endsWith("\n")
    ? eol(source)
    : "";
  return {
    start: node.range[0],
    end: node.range[1],
    text:
      rendered(value).replace(/\n/g, eol(source) + " ".repeat(indent)) +
      trailing,
  };
}
export function mapSet(
  source: string,
  map: YAMLMap,
  key: string,
  value: unknown,
): Patch {
  const pair = map.items.find((p) => String((p.key as Scalar)?.value) === key);
  if (pair) return replaceNode(source, pair.value, value);
  if (map.flow || !map.items.length) {
    const copy = map.clone();
    copy.set(key, value);
    return replaceNode(source, map, copy);
  }
  const last: any = map.items.at(-1)!.value;
  const end = last.range[2];
  const first: any = map.items[0].key;
  const indent = column(source, first.range[0]);
  const text =
    rendered({ [key]: value })
      .split("\n")
      .map((l) => " ".repeat(indent) + l)
      .join(eol(source)) + eol(source);
  return {
    start: end,
    end,
    text: (end && source[end - 1] !== "\n" ? eol(source) : "") + text,
  };
}
export function mapDelete(source: string, map: YAMLMap, key: string): Patch[] {
  const pair = map.items.find((p) => String((p.key as Scalar).value) === key);
  if (!pair) return [];
  if (map.flow || map.items.length === 1) {
    const copy = map.clone();
    copy.delete(key);
    return [replaceNode(source, map, copy)];
  }
  const k: any = pair.key,
    v: any = pair.value;
  return [{ start: startLine(source, k.range[0]), end: v.range[2], text: "" }];
}
export function insertItem(
  source: string,
  list: YAMLSeq,
  index: number,
  value: unknown,
): Patch {
  if (
    !list.items.length &&
    /:\s*$/.test(
      source.slice(startLine(source, list.range![0]), list.range![0]),
    )
  ) {
    const line = source.slice(
      startLine(source, list.range![0]),
      list.range![0],
    );
    const indent = (/^\s*/.exec(line)?.[0].length ?? 0) + 2;
    return {
      start: list.range![0],
      end: list.range![1],
      text:
        eol(source) +
        rendered([value])
          .split("\n")
          .map((l) => " ".repeat(indent) + l)
          .join(eol(source)),
    };
  }
  if (list.flow || !list.items.length) {
    const copy = list.clone();
    copy.items.splice(index, 0, new YAML.Document(value).contents as any);
    return replaceNode(source, list, copy);
  }
  const item: any = list.items[Math.min(index, list.items.length - 1)];
  const line = startLine(source, item.range[0]);
  const indent = source.slice(line, item.range[0]).indexOf("-");
  if (indent < 0) throw Error("Lista non riconosciuta");
  const at =
    index < list.items.length ? line : (list.items.at(-1) as any).range[2];
  const text =
    rendered([value])
      .split("\n")
      .map((l) => " ".repeat(indent) + l)
      .join(eol(source)) + eol(source);
  return {
    start: at,
    end: at,
    text: (at && source[at - 1] !== "\n" ? eol(source) : "") + text,
  };
}
export function deleteItem(
  source: string,
  list: YAMLSeq,
  index: number,
): Patch {
  if (list.flow || list.items.length === 1) {
    const copy = list.clone();
    copy.items.splice(index, 1);
    return replaceNode(source, list, copy);
  }
  const node: any = list.items[index];
  return {
    start: startLine(source, node.range[0]),
    end: node.range[2],
    text: "",
  };
}
export function structure(source: string) {
  const doc = parsed(source),
    blocks: Block[] = [],
    references: Reference[] = [],
    versionMaps: YAMLMap[] = [];
  const visitMaps = (n: any) => {
    if (isMap(n)) {
      for (const pair of n.items) {
        if (
          String((pair.key as Scalar).value) === "versioni" &&
          isMap(pair.value)
        )
          versionMaps.push(pair.value);
        visitMaps(pair.value);
      }
    } else if (isSeq(n)) n.items.forEach(visitMaps);
  };
  visitMaps(doc.contents);
  const walk = (list: any, path: KeyPath) => {
    if (!isSeq(list)) return;
    list.items.forEach((node, index) => {
      if (!isMap(node)) return;
      const block = { node, path: [...path, index], list, index };
      blocks.push(block);
      const ex = node.get("esercizio", true);
      if (ex) {
        const usage = isMap(ex) ? ex : node;
        const id = isMap(ex) ? ex.get("id", true) : ex;
        const versions: any = usage.get("versioni", true);
        if (isScalar(id))
          references.push({
            id: String(id.value),
            node: id,
            usage,
            block,
            versions: isMap(versions) ? versions : undefined,
          });
      }
      const group = node.get("gruppo", true);
      if (isMap(group))
        walk(group.get("esercizi", true), [
          ...path,
          index,
          "gruppo",
          "esercizi",
        ]);
    });
  };
  walk(doc.get("blocchi", true), ["blocchi"]);
  return { doc, blocks, references, versionMaps };
}
export function blockAt(source: string, offset: number) {
  return structure(source)
    .blocks.filter(
      (b) =>
        b.node.range && b.node.range[0] <= offset && offset <= b.node.range[2],
    )
    .at(-1);
}
export function assignments(
  traces: any[],
  variants: Record<string, string>,
  empty = false,
  order = Object.keys(variants),
) {
  const ordered = [
    ...traces.filter((t) => t.pubblica),
    ...traces.filter((t) => !t.pubblica),
  ];
  const names = order.filter((k) => variants[k].trim());
  return Object.fromEntries(
    ordered.map((t, i) => [String(t.id), empty ? "" : (names[i] ?? "")]),
  );
}
export function traceEdit(
  source: string,
  kind: "add" | "delete" | "rename" | "duplicate",
  id: string,
  next?: string,
): Patch[] {
  const s = structure(source),
    list = s.doc.get("tracce", true);
  if (!isSeq(list)) throw Error("Sezione tracce mancante");
  const index = list.items.findIndex(
    (t) => isMap(t) && String(t.get("id")) === id,
  );
  if (kind !== "add" && index < 0) throw Error("Traccia non trovata");
  if (kind === "delete" && list.items.length === 1)
    throw Error("Conservare almeno una traccia");
  const target = kind === "add" ? id : next;
  if (
    kind !== "delete" &&
    (!target ||
      !/^[\w-]+$/.test(target) ||
      target === "default" ||
      list.items.some((t) => isMap(t) && String(t.get("id")) === target))
  )
    throw Error("Nome traccia non valido o già presente");
  const patches: Patch[] = [];
  if (kind === "add")
    patches.push(insertItem(source, list, list.items.length, { id }));
  if (kind === "delete") patches.push(deleteItem(source, list, index));
  if (kind === "rename")
    patches.push(
      scalarPatch(
        (list.items[index] as YAMLMap).get("id", true) as Scalar,
        next!,
      ),
    );
  if (kind === "duplicate") {
    const original = (list.items[index] as YAMLMap).toJSON();
    delete original.pubblica;
    original.id = next;
    delete original.etichetta;
    patches.push(insertItem(source, list, index + 1, original));
  }
  const exerciseMaps = new Set(
    s.references.map((r) => r.versions).filter(Boolean),
  );
  for (const map of s.versionMaps) {
    if (kind === "delete") patches.push(...mapDelete(source, map, id));
    else if (kind === "rename" && map.has(id)) {
      const pair = map.items.find(
        (p) => String((p.key as Scalar).value) === id,
      )!;
      patches.push(scalarPatch(pair.key as Scalar, next!));
    } else if (kind === "add" && exerciseMaps.has(map))
      patches.push(mapSet(source, map, id, ""));
    else if (kind === "duplicate") {
      const value = map.get(id) ?? map.get("default");
      if (value !== undefined || exerciseMaps.has(map))
        patches.push(mapSet(source, map, next!, value ?? ""));
    }
  }
  if (kind === "add" || kind === "duplicate")
    for (const r of s.references)
      if (!r.versions)
        patches.push(mapSet(source, r.usage, "versioni", { [target!]: "" }));
  return patches;
}
export function variants(source: string) {
  return [
    ...source.matchAll(
      /^:::variante[ \t]+([^\s]+)[ \t]*\r?\n([\s\S]*?)^:::[ \t]*\r?$/gm,
    ),
  ].map((m) => ({
    id: m[1],
    body: m[2],
    start: m.index!,
    end: m.index! + m[0].length,
    nameStart: m.index! + m[0].indexOf(m[1]),
  }));
}
export function examTemplate(title: string) {
  return YAML.stringify({
    titolo: title,
    tracce: [{ id: "prova", pubblica: true }, { id: "1" }],
    blocchi: [],
  });
}
