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
  exerciseBlockInsertion,
} from "../src/document";
import { exercise } from "../src/core";

const example = `# Titolo da conservare\ntitolo: Test\ntracce:\n  - id: prova # Pubblica\n    pubblica: true\n  - id: '1'\nblocchi:\n  - gruppo:\n      istruzioni: Testo\n      esercizi:\n        - esercizio: scienze/esempio\n          punti: 2\n          versioni:\n            default: base # Variante\n            '1': altra\n  - istruzioni:\n      versioni:\n        default: Testo\n        '1': Testo specifico\n`;
const traceExercises = new Map([
  [
    "scienze/esempio",
    {
      varianti: { base: "Uno", vuota: " \n", altra: "Due", terza: "Tre" },
      variantOrder: ["base", "vuota", "altra", "terza"],
    },
  ],
]);
test("aggiunta traccia usa la prima variante libera e conserva commenti e CRLF", () => {
  for (const source of [example, example.replace(/\n/g, "\r\n")]) {
    const result = applyPatches(
        source,
        traceEdit(source, "add", "2", undefined, traceExercises),
      ),
      v = YAML.parse(result);
    assert.equal(v.blocchi[0].gruppo.esercizi[0].versioni["2"], "terza");
    assert.equal(v.tracce.length, 3);
    assert.deepEqual(v.blocchi[1], YAML.parse(source).blocchi[1]);
    assert.ok(result.includes("default: base # Variante"));
    assert.ok(result.startsWith("# Titolo da conservare"));
    if (source.includes("\r")) assert.ok(!/(?<!\r)\n/.test(result));
    const exhausted = YAML.parse(
      applyPatches(
        result,
        traceEdit(result, "add", "3", undefined, traceExercises),
      ),
    );
    assert.equal(exhausted.blocchi[0].gruppo.esercizi[0].versioni["3"], "");
  }
});
test("conta solo le assegnazioni effettive, con default e omissioni esplicite", () => {
  for (const [versioni, expected] of [
    [{ default: "base", "1": "altra" }, "terza"],
    [{ default: "base", prova: "altra", "1": "altra" }, "base"],
    [{ default: "base", prova: "", "1": "altra" }, "base"],
    [{ default: "altra", prova: "base", "1": "" }, "altra"],
  ] as const) {
    const source = YAML.stringify({
      titolo: "Test",
      tracce: [{ id: "1" }, { id: "prova", pubblica: true }],
      blocchi: [{ esercizio: { id: "scienze/esempio", punti: 2, versioni } }],
    });
    const result = YAML.parse(
      applyPatches(
        source,
        traceEdit(source, "add", "2", undefined, traceExercises),
      ),
    );
    assert.deepEqual(result.blocchi[0].esercizio, {
      id: "scienze/esempio",
      punti: 2,
      versioni: { ...versioni, "2": expected },
    });
  }
});
test("riserva le varianti per ID tra tutti gli usi, anche annidati e senza mappa", () => {
  const source = `titolo: Test
tracce: [{id: prova, pubblica: true}, {id: '1'}]
blocchi:
  - esercizio: ripetuto
    versioni: {prova: base, '1': ''}
  - gruppo:
      punti: 5
      esercizi:
        - gruppo:
            esercizi:
              - esercizio: {id: ripetuto, versioni: {prova: '', '1': terza}}
              - esercizio: {id: ripetuto}
  - esercizio: altro
`;
  const variants = {
    varianti: { base: "Uno", terza: "Tre", seconda: "Due", quarta: "Quattro" },
    variantOrder: ["base", "terza", "seconda", "quarta"],
  };
  const exercises = new Map([
    ["ripetuto", variants],
    ["altro", variants],
  ]);
  const result = applyPatches(
    source,
    traceEdit(source, "add", "2", undefined, exercises),
  );
  const refs = structure(result).references;
  assert.deepEqual(
    refs.map((r) => r.versions!.get("2")),
    ["seconda", "quarta", "", "base"],
  );
  assert.equal(
    structure(result).doc.getIn(["blocchi", 1, "gruppo", "punti"]),
    5,
  );
  for (const [index, ref] of structure(source).references.entries()) {
    const after = refs[index].usage.toJSON();
    delete after.versioni["2"];
    if (!ref.versions) delete after.versioni;
    assert.deepEqual(after, ref.usage.toJSON());
  }
});
test("aggiunta traccia segue l'ordine testuale dei nomi numerici", () => {
  const e = exercise(
    "---\ntipo: A\n---\n\n:::variante 10\nUno\n:::\n\n:::variante 2\nDue\n:::\n\n:::variante 1\nTre\n:::\n",
  );
  const exercises = new Map([["esempio", e]]);
  let source =
    "titolo: Test\ntracce: [{id: prova}]\nblocchi: [{esercizio: esempio, versioni: {prova: '1'}}]\n";
  for (const [trace, expected] of [
    ["1", "10"],
    ["2", "2"],
    ["3", ""],
  ]) {
    source = applyPatches(
      source,
      traceEdit(source, "add", trace, undefined, exercises),
    );
    assert.equal(
      structure(source).references[0].versions!.get(trace),
      expected,
    );
  }
});
test("aggiunta traccia vuota e rifiuto del catalogo incompleto", () => {
  const source = examTemplate("Vuota");
  assert.equal(
    YAML.parse(applyPatches(source, traceEdit(source, "add", "2"))).tracce
      .length,
    3,
  );
  assert.throws(
    () => traceEdit(example, "add", "2"),
    /scienze\/esempio: varianti non caricate/,
  );
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
test("punto predefinito nella lista di destinazione, salvo gruppi con punteggio", () => {
  const usage = { id: "scienze/nuovo", versioni: { prova: "base" } };
  for (const points of [undefined, 0, 4]) {
    const source = example.replace(
      "      istruzioni: Testo",
      `${points === undefined ? "" : `      punti: ${points}\n`}      istruzioni: Testo`,
    );
    const groupAt = source.indexOf("istruzioni: Testo"),
      childAt = source.indexOf("scienze/esempio");
    for (const [at, side, inside] of [
      [groupAt, "inside", true],
      [childAt, "before", true],
      [childAt, "after", true],
      [groupAt, "before", false],
      [groupAt, "after", false],
    ] as const) {
      const result = applyPatches(source, [
        exerciseBlockInsertion(source, at, usage, true, side),
      ]);
      const s = structure(result);
      const inserted = s.references.find((r) => r.id === usage.id)!;
      assert.equal(
        inserted.usage.get("punti"),
        inside && points !== undefined ? undefined : 1,
      );
      assert.deepEqual(inserted.usage.toJSON().versioni, usage.versioni);
      assert.equal(inserted.block.path.length > 2, inside);
      assert.ok(result.includes("default: base # Variante"));
      assert.equal(
        s.references
          .find((r) => r.id === "scienze/esempio")!
          .usage.get("punti"),
        2,
      );
    }
  }
});
test("punteggio disattivato e gruppi vuoti o annidati, anche con CRLF", () => {
  const usage = { id: "nuovo", versioni: { prova: "" } };
  for (const newline of ["\n", "\r\n"]) {
    for (const outerScore of [undefined, 0, 5]) {
      const source = YAML.stringify({
        titolo: "Test",
        tracce: [{ id: "prova" }],
        blocchi: [
          {
            gruppo: {
              ...(outerScore === undefined ? {} : { punti: outerScore }),
              esercizi: [{ gruppo: { istruzioni: "Interno", esercizi: [] } }],
            },
          },
        ],
      }).replace(/\n/g, newline);
      const at = source.indexOf("istruzioni: Interno");
      for (const enabled of [false, true]) {
        const result = applyPatches(source, [
          exerciseBlockInsertion(source, at, usage, enabled, "inside"),
        ]);
        const reference = structure(result).references[0];
        assert.equal(
          reference.usage.get("punti"),
          enabled && outerScore === undefined ? 1 : undefined,
        );
        assert.deepEqual(reference.block.path, [
          "blocchi",
          0,
          "gruppo",
          "esercizi",
          0,
          "gruppo",
          "esercizi",
          0,
        ]);
        if (newline === "\r\n") assert.ok(!/(?<!\r)\n/.test(result));
      }
    }
    const source = examTemplate("Vuota").replace(/\n/g, newline);
    for (const enabled of [false, true]) {
      const result = applyPatches(source, [
        exerciseBlockInsertion(source, 0, usage, enabled),
      ]);
      assert.equal(
        YAML.parse(result).blocchi[0].esercizio.punti,
        enabled ? 1 : undefined,
      );
    }
  }
});
test("sostituzione di valore multilinea conserva la chiave seguente", () => {
  const source = "testo: |\n  Prima\n  Seconda\naltro: sì\n";
  const map = structure(source).doc.contents as YAMLMap;
  const result = applyPatches(source, [mapSet(source, map, "testo", "Nuovo")]);
  assert.equal(YAML.parse(result).altro, "sì");
});
