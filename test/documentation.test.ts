import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { Repository, enumerate } from "../src/repository";
import { content, exercise, exam, render, validate } from "../src/core";

test("gli esempi pubblici rendono tutti i tipi e due tracce da 10 punti", async () => {
  const base = path.resolve("docs/esempi/contenuti");
  const types = new Set<string>();
  for (const file of await enumerate(path.join(base, "esercizi"), /\.md$/)) {
    const e = exercise(await fs.readFile(file, "utf8"));
    types.add(e.tipo);
    for (const text of Object.values(e.varianti)) content(text, e.tipo);
  }
  assert.deepEqual([...types].sort(), [
    "A",
    "Completamento",
    "Etichettare",
    "SM",
    "VF",
  ]);
  const snapshot = await new Repository(base).snapshot(
    path.join(base, "verifiche/dimostrativa.yaml"),
  );
  const result = validate(snapshot.exam, snapshot.library);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(
    result.tracce.map((trace: any) => [trace.id, trace.count, trace.total]),
    [
      ["prova", 5, 10],
      ["1", 5, 10],
    ],
  );
  for (const trace of snapshot.exam.tracce) {
    const html = render(snapshot.exam, String(trace.id), snapshot.library).html;
    assert.match(html, /class="page-break"/);
    assert.match(html, /katex/);
    assert.match(html, /\/allegati\/schema.svg/);
  }
});

test("il tutorial e l'esempio completo del riferimento risolvono le varianti", async () => {
  const tutorial = await fs.readFile("docs/guida/prima-verifica.md", "utf8");
  const exerciseSource = /```markdown\r?\n([\s\S]*?)```/.exec(tutorial)![1];
  const examSource = /```yaml\r?\n([\s\S]*?)```/.exec(tutorial)![1];
  const library = {
    base: path.resolve("docs/esempi/contenuti"),
    exercises: new Map([["scienze/acqua", exercise(exerciseSource)]]),
  };
  const result = validate(exam(examSource), library);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(
    result.tracce.map((trace: any) => [trace.count, trace.total]),
    [
      [1, 1],
      [1, 1],
    ],
  );
  const reference = await fs.readFile(
    "docs/riferimento/formato-verifiche.md",
    "utf8",
  );
  const source = /```yaml\r?\n([\s\S]*?)```/.exec(reference)![1];
  assert.deepEqual(validate(exam(source), library).errors, []);
});
