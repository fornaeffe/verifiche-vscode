import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { Dependencies } from "../src/dependencies";
import { Repository } from "../src/repository";
import { exam, exercise, render, validate } from "../src/core";

test("dipendenze: percorsi normalizzati, cartelle e isolamento delle radici", () => {
  const dependencies = new Dependencies(
    path.resolve("fixture/contenuti/esercizi/a.md"),
  );
  assert.equal(
    dependencies.affects(path.resolve("fixture/contenuti/esercizi/./a.md")),
    true,
  );
  assert.equal(
    dependencies.affects(path.resolve("fixture/contenuti/esercizi")),
    true,
  );
  assert.equal(
    dependencies.affects(path.resolve("fixture/contenuti/esercizi/a.md.bak")),
    false,
  );
  assert.equal(
    dependencies.affects(path.resolve("altra/contenuti/esercizi/a.md")),
    false,
  );
  if (process.platform === "win32")
    assert.equal(
      dependencies.affects(path.resolve("FIXTURE/CONTENUTI/ESERCIZI/A.MD")),
      true,
    );
});

test("snapshot registra tutti i riferimenti prima di incontrare un file mancante", async () => {
  const base = path.resolve("fixture/contenuti"),
    file = path.join(base, "verifiche/test.yaml"),
    dependencies = new Dependencies(),
    reads: string[] = [],
    repository = new Repository(base, async (p) => {
      reads.push(p);
      if (p !== file) throw Error("File mancante");
      return "titolo: Test\ntracce: [{id: prova}]\nblocchi: [{esercizio: primo, versioni: {prova: base}}, {esercizio: secondo, versioni: {prova: base}}]\n";
    });
  await assert.rejects(
    repository.snapshot(file, dependencies.add),
    /File mancante/,
  );
  assert.deepEqual(reads, [file, path.join(base, "esercizi/primo.md")]);
  for (const name of ["primo", "secondo"])
    assert.equal(
      dependencies.affects(path.join(base, `esercizi/${name}.md`)),
      true,
    );
  assert.equal(
    dependencies.affects(path.join(base, "esercizi/estraneo.md")),
    false,
  );
});

test("render e diagnostica registrano anche allegati mancanti e tracce non selezionate", () => {
  const base = path.resolve("fixture/contenuti"),
    document = exam(
      "titolo: Test\ntracce: [{id: prova}, {id: altra}]\nblocchi: [{esercizio: esempio, versioni: {prova: base, altra: seconda}}]\n",
    ),
    library = {
      base,
      exercises: new Map([
        [
          "esempio",
          exercise(
            "---\ntipo: A\n---\n:::variante base\n![A](/allegati/prima%20immagine.svg)\n![B](/allegati/seconda.svg)\n:::\n:::variante seconda\n![C](/allegati/terza.svg)\n:::\n",
            "esempio",
          ),
        ],
      ]),
    },
    preview = new Dependencies(),
    diagnostics = new Dependencies();
  assert.throws(
    () => render(document, "prova", library, preview.add),
    /Allegato mancante/,
  );
  assert.equal(
    preview.affects(path.join(base, "allegati/prima immagine.svg")),
    true,
  );
  assert.equal(preview.affects(path.join(base, "allegati/seconda.svg")), true);
  assert.equal(preview.affects(path.join(base, "allegati/terza.svg")), false);
  assert.equal(validate(document, library, diagnostics.add).errors.length, 2);
  assert.equal(
    diagnostics.affects(path.join(base, "allegati/terza.svg")),
    true,
  );
});
