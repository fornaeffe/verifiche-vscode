import { test } from "node:test";
import assert from "node:assert/strict";
import YAML, { isMap, isSeq, YAMLMap } from "yaml";
import {
  applyPatches,
  structure,
  traceEdit,
  mapSet,
  insertItem,
  assignments,
  examTemplate,
  variants,
} from "../src/document";

const example = `# Titolo da conservare\ntitolo: Test\ntracce:\n  - id: prova # Pubblica\n    pubblica: true\n  - id: '1'\nblocchi:\n  - gruppo:\n      istruzioni: Testo\n      esercizi:\n        - esercizio: scienze/esempio\n          punti: 2\n          versioni:\n            default: base # Variante\n            '1': altra\n  - istruzioni:\n      versioni:\n        default: Testo\n        '1': Testo specifico\n`;
test("aggiunta traccia esclude esercizi anche con default e conserva commenti e CRLF", () => {
  for (const source of [example, example.replace(/\n/g, "\r\n")]) {
    const result = applyPatches(source, traceEdit(source, "add", "2")),
      v = YAML.parse(result);
    assert.equal(v.blocchi[0].gruppo.esercizi[0].versioni["2"], "");
    assert.equal(v.tracce.length, 3);
    assert.ok(result.includes("default: base # Variante"));
    assert.ok(result.startsWith("# Titolo da conservare"));
    if (source.includes("\r")) assert.ok(!/(?<!\r)\n/.test(result));
  }
});
test("elimina e rinomina traccia in tutte le mappe, duplica risolvendo default", () => {
  const deleted = YAML.parse(
    applyPatches(example, traceEdit(example, "delete", "1")),
  );
  assert.equal(deleted.tracce.length, 1);
  assert.equal(deleted.blocchi[1].istruzioni.versioni["1"], undefined);
  const renamed = YAML.parse(
    applyPatches(example, traceEdit(example, "rename", "1", "b")),
  );
  assert.equal(renamed.blocchi[0].gruppo.esercizi[0].versioni.b, "altra");
  const copy = YAML.parse(
    applyPatches(example, traceEdit(example, "duplicate", "prova", "b")),
  );
  assert.equal(copy.blocchi[0].gruppo.esercizi[0].versioni.b, "base");
  assert.equal(copy.tracce[1].pubblica, undefined);
});
test("inserisci nei gruppi e nelle liste vuote senza riscrivere il documento", () => {
  const s = structure(example),
    group = s.doc.getIn(["blocchi", 0, "gruppo", "esercizi"], true);
  assert.ok(isSeq(group));
  const result = applyPatches(example, [
    insertItem(example, group, 0, { istruzioni: { testo: "Prima" } }),
  ]);
  assert.equal(
    YAML.parse(result).blocchi[0].gruppo.esercizi[0].istruzioni.testo,
    "Prima",
  );
  assert.ok(result.includes("'1': altra"));
  const empty = examTemplate("Vuota"),
    list = structure(empty).doc.get("blocchi", true);
  assert.ok(isSeq(list));
  const inserted = applyPatches(empty, [
    insertItem(empty, list, 0, { gruppo: { istruzioni: "", esercizi: [] } }),
  ]);
  const nested = structure(inserted).doc.getIn(
    ["blocchi", 0, "gruppo", "esercizi"],
    true,
  );
  assert.ok(isSeq(nested));
  const next = applyPatches(inserted, [
    insertItem(inserted, nested, 0, { salto_pagina: true }),
  ]);
  assert.equal(
    YAML.parse(next).blocchi[0].gruppo.esercizi[0].salto_pagina,
    true,
  );
});
test("assegnazioni pubblica prima, ignora varianti vuote, nessun riciclo", () => {
  const ts = [
    { id: "1" },
    { id: "prova", pubblica: true },
    { id: "2" },
    { id: "3" },
  ];
  assert.deepEqual(assignments(ts, { vuota: " ", v1: "uno", v2: "due" }), {
    "1": "v2",
    prova: "v1",
    "2": "",
    "3": "",
  });
  assert.deepEqual(assignments(ts, { v1: "uno" }, true), {
    "1": "",
    prova: "",
    "2": "",
    "3": "",
  });
});
test("sostituzione di valore multilinea conserva la chiave seguente", () => {
  const source = "testo: |\n  Prima\n  Seconda\naltro: sì\n";
  const map = structure(source).doc.contents as YAMLMap;
  const result = applyPatches(source, [mapSet(source, map, "testo", "Nuovo")]);
  assert.equal(YAML.parse(result).altro, "sì");
});
