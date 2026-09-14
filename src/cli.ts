import path from "node:path";
import fs from "node:fs/promises";
import { Repository, enumerate } from "./repository";
import { validate } from "./core";
import { planMigration, applyMigration } from "./migration";
import { exportPDF } from "./pdf";

export async function main(args = process.argv.slice(2)) {
  const [command, root, ...rest] = args;
  if (!root || !["validate", "migrate", "pdf"].includes(command))
    throw Error(
      "Uso: cli validate|migrate|pdf CARTELLA_DATI [FILE_VERIFICA TRACCIA|tutte] [--apply] [--report FILE]",
    );
  const base = path.resolve(root, "contenuti");
  if (command === "migrate") {
    const plan = await planMigration(base);
    const report = {
      files: plan.changes.map((c) => path.relative(root, c.file)),
      traces: plan.traces,
      baselineErrors: plan.baselineErrors,
      mapping: plan.mapping,
    };
    const at = rest.indexOf("--report");
    if (at >= 0) {
      await fs.mkdir(path.dirname(path.resolve(rest[at + 1])), {
        recursive: true,
      });
      await fs.writeFile(rest[at + 1], JSON.stringify(report, null, 2));
    }
    console.log(
      JSON.stringify(
        {
          files: report.files.length,
          traces: report.traces,
          baselineErrors: report.baselineErrors,
          mode: rest.includes("--apply") ? "apply" : "dry-run",
        },
        null,
        2,
      ),
    );
    if (rest.includes("--apply")) await applyMigration(plan);
    return;
  }
  const repo = new Repository(base);
  if (command === "validate") {
    let failures = 0;
    for (const file of await enumerate(path.join(base, "esercizi"), /\.md$/i))
      try {
        await repo.getExercise(
          path
            .relative(path.join(base, "esercizi"), file)
            .replace(/\\/g, "/")
            .slice(0, -3),
        );
      } catch (e) {
        console.error(file, String(e));
        failures++;
      }
    for (const file of await enumerate(
      path.join(base, "verifiche"),
      /\.ya?ml$/i,
    ))
      try {
        const s = await repo.snapshot(file),
          v = validate(s.exam, s.library);
        console.log(path.relative(root, file), JSON.stringify(v));
        failures += v.errors.length;
      } catch (e) {
        console.error(file, String(e));
        failures++;
      }
    if (failures) process.exitCode = 1;
    return;
  }
  const file = path.resolve(root, rest[0]),
    s = await repo.snapshot(file);
  const traces =
    rest[1] === "tutte"
      ? s.exam.tracce.map((t: any) => String(t.id))
      : [rest[1] ?? String(s.exam.tracce[0].id)];
  console.log(await exportPDF(s, traces, path.resolve(__dirname, "../dist")));
}
if (require.main === module)
  void main().catch((e) => {
    console.error(String(e));
    process.exitCode = 1;
  });
