import { test } from "node:test";
import assert from "node:assert/strict";
import YAML from "yaml";
import { exam, exercise, render } from "../src/core";
import {
  hasRandomGroups,
  newSeed,
  normalizeSeed,
  orderForTrace,
  pdfFilename,
} from "../src/random-order";
import { pdfArguments } from "../src/cli";

const seed = "7f3a9c2d84b610ef";
const ex = (id: string, versions = { default: "base" }) => ({
  esercizio: { id, punti: 1, versioni: versions },
});
const group = (children: any[], random?: boolean) => ({
  gruppo: {
    istruzioni: "Istruzioni del gruppo",
    punti: 2,
    ...(random === undefined ? {} : { ordine_casuale: random }),
    esercizi: children,
  },
});
const document = (blocks: any[]) =>
  exam(
    YAML.stringify({
      titolo: "Prova sintetica",
      tracce: [{ id: "prova", pubblica: true }, { id: "1" }],
      blocchi: blocks,
    }),
  );
const frozen = (value: any) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
};

test("ordine_casuale accetta solo booleani, anche nei gruppi annidati", () => {
  for (const invalid of ["true", 1, null, [], {}])
    assert.throws(
      () => document([group([group([], invalid as any)])]),
      /ordine_casuale.*booleano/,
    );
  const v = document([group([group([], true)], false), group([])]);
  assert.ok(hasRandomGroups(v.blocchi));
  assert.equal(
    hasRandomGroups(document([group([group([], false)])]).blocchi),
    false,
  );
});

test("riordino deterministico: gruppi atomici, sorgente immutabile e percorsi originali", () => {
  const fixed = group([ex("b"), ex("c")]);
  const nested = group([ex("d"), ex("e"), ex("f"), ex("g")], true);
  const v = frozen(
    document([
      { contenuto: "Prima" },
      group([ex("a"), fixed, nested, ex("h")], true),
      { salto_pagina: true },
    ]),
  );
  const before = JSON.stringify(v);
  const result = orderForTrace(v, "1", seed);
  assert.deepEqual(result, orderForTrace(v, "1", seed.toUpperCase()));
  assert.equal(JSON.stringify(v), before);
  assert.deepEqual(result.blocchi[0], v.blocchi[0]);
  assert.deepEqual(result.blocchi[2], v.blocchi[2]);
  const children = result.blocchi[1].gruppo.esercizi;
  assert.equal(children.length, 4);
  assert.deepEqual(
    children.find((b: any) => b.gruppo && !b.gruppo.ordine_casuale),
    fixed,
  );
  assert.deepEqual(
    children
      .find((b: any) => b.gruppo?.ordine_casuale)
      .gruppo.esercizi.map((b: any) => b.esercizio.id)
      .sort(),
    ["d", "e", "f", "g"],
  );
  // Disabling the parent's shuffle must not change the nested group's stream.
  const unshuffled = structuredClone(v);
  unshuffled.blocchi[1].gruppo.ordine_casuale = false;
  const internal = orderForTrace(unshuffled, "1", seed).blocchi[1].gruppo
    .esercizi[2];
  assert.deepEqual(
    children.find((b: any) => b.gruppo?.ordine_casuale),
    internal,
  );
  const batch = ["prova", "1"].map((trace) => orderForTrace(v, trace, seed));
  assert.deepEqual(batch[1], result);
});

test("sequenza v1 stabile, indipendente per traccia, include tutti i tipi di figlio", () => {
  const blocks = [
    ex("a"),
    ex("b"),
    ex("c"),
    { contenuto: "Testo" },
    { istruzioni: { testo: "Consegna", punti: 1 } },
    { salto_pagina: true },
  ];
  const v = document([group(blocks, true)]);
  const ids = (trace: string, s = seed) =>
    orderForTrace(v, trace, s).blocchi[0].gruppo.esercizi.map(
      (b: any) => b.esercizio?.id ?? Object.keys(b)[0],
    );
  // This expected permutation is a compatibility contract, not a statistical assertion.
  assert.deepEqual(ids("1"), [
    "b",
    "contenuto",
    "a",
    "istruzioni",
    "c",
    "salto_pagina",
  ]);
  assert.notDeepEqual(ids("1"), ids("prova"));
  assert.notDeepEqual(ids("1"), ids("1", "0000000000000000"));
  for (const children of [[], [ex("a")]]) {
    const small = document([group(children, true)]);
    assert.deepEqual(orderForTrace(small, "1", seed), small);
  }
});

test("riordino mantiene varianti, omissioni, punteggi e numerazione continua", () => {
  const v = document([
    group(
      [ex("a"), group([ex("b"), ex("c")]), ex("omesso", { default: "" })],
      true,
    ),
  ]);
  const library = {
    base: process.cwd(),
    exercises: new Map(
      ["a", "b", "c", "omesso"].map((id) => [
        id,
        exercise(`---\ntipo: A\n---\n:::variante base\nDomanda ${id}.\n:::\n`),
      ]),
    ),
  };
  const before = render(v, "1", library);
  const after = render(orderForTrace(v, "1", seed), "1", library);
  assert.equal(after.total, before.total);
  assert.equal(after.count, 3);
  assert.deepEqual([...after.order].sort(), ["a", "b", "c"]);
  assert.deepEqual(
    [...after.html.matchAll(/class="numero">(\d+)\./g)].map((m) => +m[1]),
    [1, 2, 3],
  );
  assert.ok(after.html.includes("Istruzioni del gruppo"));
  assert.equal(render(v, "1", library).html, before.html);
});

test("semi e nomi PDF: normalizzazione, sicurezza e separazione delle generazioni", () => {
  assert.match(newSeed(), /^[0-9a-f]{16}$/);
  assert.equal(normalizeSeed("  " + seed.toUpperCase() + "  "), seed);
  for (const bad of ["", "../123456789abcd", "123", seed + "0", "z".repeat(16)])
    assert.throws(() => normalizeSeed(bad), /16 caratteri esadecimali/);
  assert.equal(pdfFilename("1"), "traccia-1.pdf");
  assert.equal(
    pdfFilename("1", seed.toUpperCase()),
    `traccia-1.seme-${seed}.pdf`,
  );
  assert.notEqual(pdfFilename("1", seed), pdfFilename("1", "0000000000000000"));
  assert.throws(() => pdfFilename("1", "../../fuori"));
});

test("CLI PDF: ordine originale, seme automatico o esplicito, argomenti invalidi", () => {
  assert.deepEqual(pdfArguments(["prova.yaml"]), {
    file: "prova.yaml",
    trace: undefined,
    seed: undefined,
  });
  assert.equal(pdfArguments(["prova.yaml", "--shuffle"]).seed?.length, 16);
  assert.deepEqual(
    pdfArguments(["--seed", seed.toUpperCase(), "prova.yaml", "tutte"]),
    { file: "prova.yaml", trace: "tutte", seed },
  );
  assert.equal(
    pdfArguments(["prova.yaml", "1", "--shuffle", "--seed", seed]).seed,
    seed,
  );
  for (const bad of [
    [],
    ["--shuffle"],
    ["x", "--seed"],
    ["x", "--seed", "bad"],
    ["x", "--unknown"],
    ["x", "--shuffle", "--shuffle"],
    ["x", "--seed", seed, "--seed", seed],
    ["x", "1", "extra"],
  ])
    assert.throws(() => pdfArguments(bad));
});
