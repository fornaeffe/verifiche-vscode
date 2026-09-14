import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Repository, exercisePath } from "../src/repository";
import { planMigration, applyMigration } from "../src/migration";
import { render, exercise } from "../src/core";
import { assignments } from "../src/document";

test("risolve soltanto le dipendenze e usa i buffer non salvati", async () => {
  const base = path.resolve("test/fixtures/workspace/contenuti"),
    file = path.join(base, "verifiche/esempio.yaml"),
    reads: string[] = [];
  const repo = new Repository(base, async (p) => {
    reads.push(p);
    const source = await fs.readFile(p, "utf8");
    return p.endsWith(".md")
      ? source.replace(
          "Descrivi un passaggio di stato.",
          "Domanda modificata nel buffer.",
        )
      : source;
  });
  const s = await repo.snapshot(file);
  assert.equal(reads.length, 2);
  assert.match(
    render(s.exam, "prova", s.library).html,
    /Domanda modificata nel buffer/,
  );
  assert.throws(() => exercisePath(base, "../esterno"));
  assert.throws(() => exercisePath(base, "a\\b"));
  assert.throws(() => exercisePath(base, "C:/file"));
});
test("migrazione aggiorna entrambe le forme, mantiene resa ed è idempotente", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "verifiche-migration-"));
  try {
    const base = path.join(root, "contenuti");
    await fs.mkdir(path.join(base, "esercizi/sotto"), { recursive: true });
    await fs.mkdir(path.join(base, "verifiche"), { recursive: true });
    await fs.writeFile(
      path.join(base, "esercizi/sotto/esempio.md"),
      "---\nid: vecchio\ntipo: A\n# Nota\n---\n\n:::variante base\nDomanda.\n:::\n",
    );
    await fs.writeFile(
      path.join(base, "verifiche/test.yaml"),
      `titolo: Test\ntracce: [{id: prova}]\nblocchi:\n  - esercizio: vecchio\n    versioni: {default: base}\n  - esercizio:\n      id: vecchio\n      versioni: {default: base}\n`,
    );
    const plan = await planMigration(base);
    assert.equal(plan.traces, 1);
    assert.equal(plan.changes.length, 2);
    await applyMigration(plan);
    const second = await planMigration(base);
    assert.equal(second.changes.length, 0);
    assert.match(
      await fs.readFile(path.join(base, "esercizi/sotto/esempio.md"), "utf8"),
      /# Nota/,
    );
    assert.equal(
      (
        await new Repository(base).snapshot(
          path.join(base, "verifiche/test.yaml"),
        )
      ).library.exercises.size,
      1,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test("migrazione rifiuta scrittura se un file cambia dopo la simulazione", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "verifiche-revision-"));
  try {
    const file = path.join(root, "file.md");
    await fs.writeFile(file, "modificato");
    await assert.rejects(() =>
      applyMigration({
        changes: [{ file, before: "prima", after: "dopo" }],
        mapping: {},
        traces: 0,
        baselineErrors: [],
      }),
    );
    assert.equal(await fs.readFile(file, "utf8"), "modificato");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("varianti numeriche mantengono l'ordine del sorgente", () => {
  const e = exercise(
    "---\ntipo: A\n---\n\n:::variante 10\nPrima.\n:::\n\n:::variante 2\nSeconda.\n:::\n",
    "esempio",
  );
  assert.deepEqual(
    assignments(
      [{ id: "prova", pubblica: true }, { id: "1" }],
      e.varianti,
      false,
      e.variantOrder,
    ),
    { prova: "10", "1": "2" },
  );
});

test("migrazione risolve il vecchio ID implicito basename in una sottocartella", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "verifiche-implicit-"));
  try {
    const base = path.join(root, "contenuti");
    await fs.mkdir(path.join(base, "esercizi/sotto"), { recursive: true });
    await fs.mkdir(path.join(base, "verifiche"), { recursive: true });
    await fs.writeFile(
      path.join(base, "esercizi/sotto/esempio.md"),
      "---\ntipo: A\n---\n\n:::variante base\nDomanda.\n:::\n",
    );
    await fs.writeFile(
      path.join(base, "verifiche/test.yaml"),
      "titolo: Test\ntracce: [{id: prova}]\nblocchi: [{esercizio: esempio, versioni: {default: base}}]\n",
    );
    const plan = await planMigration(base);
    assert.equal(plan.traces, 1);
    assert.equal(plan.changes.length, 1);
    await applyMigration(plan);
    assert.equal((await planMigration(base)).changes.length, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
