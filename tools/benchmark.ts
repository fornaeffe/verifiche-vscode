import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { Repository, enumerate } from "../src/repository";
import { render, validate } from "../src/core";

async function main() {
  const base = path.resolve(
    process.argv[2] ?? "test/fixtures/workspace",
    "contenuti",
  );
  const files = await enumerate(path.join(base, "verifiche"), /\.ya?ml$/i);
  const measures = [];
  let reads = 0;
  const repo = new Repository(base, async (file) => {
    reads++;
    return fs.readFile(file, "utf8");
  });
  for (const file of files) {
    const start = performance.now();
    const s = await repo.snapshot(file);
    validate(s.exam, s.library);
    measures.push(performance.now() - start);
  }
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "verifiche-scale-"));
  try {
    const root = path.join(temp, "contenuti");
    await fs.mkdir(path.join(root, "esercizi"), { recursive: true });
    await fs.mkdir(path.join(root, "verifiche"), { recursive: true });
    const exercise =
      "---\ntipo: A\n---\n\n:::variante base\nDomanda sintetica.\n:::\n";
    const timings = [];
    for (const size of [524, 1572]) {
      const start = performance.now();
      for (let i = 0; i < size; i++)
        await fs.writeFile(path.join(root, "esercizi", i + ".md"), exercise);
      await fs.writeFile(
        path.join(root, "verifiche/test.yaml"),
        "titolo: Test\ntracce: [{id: prova}]\nblocchi:\n" +
          Array.from(
            { length: 20 },
            (_, i) => `  - esercizio: "${i}"\n    versioni: {default: base}\n`,
          ).join(""),
      );
      let count = 0;
      const r = new Repository(root, async (file) => {
        count++;
        return fs.readFile(file, "utf8");
      });
      const active = performance.now();
      const s = await r.snapshot(path.join(root, "verifiche/test.yaml"));
      render(s.exam, "prova", s.library);
      timings.push({
        size,
        activeMs: Math.round((performance.now() - active) * 10) / 10,
        filesRead: count,
      });
    }
    measures.sort((a, b) => a - b);
    console.log(
      JSON.stringify(
        {
          exams: files.length,
          sourceReads: reads,
          p50Ms: Math.round(measures[Math.floor(measures.length * 0.5)] ?? 0),
          p95Ms: Math.round(measures[Math.floor(measures.length * 0.95)] ?? 0),
          maxMs: Math.round(measures.at(-1) ?? 0),
          scale: timings,
        },
        null,
        2,
      ),
    );
  } finally {
    if (
      !path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep) ||
      !path.basename(temp).startsWith("verifiche-scale-")
    )
      throw Error("Directory temporanea non valida");
    await fs.rm(temp, { recursive: true, force: true });
  }
}
void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
