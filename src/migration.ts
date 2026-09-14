import path from "node:path";
import fs from "node:fs/promises";
import YAML, { isMap } from "yaml";
import { enumerate, relativeId } from "./repository";
import {
  structure,
  scalarPatch,
  applyPatches,
  mapDelete,
  parsed,
} from "./document";
import { exercise, exam, render, uses } from "./core";

export interface MigrationChange {
  file: string;
  before: string;
  after: string;
}
export async function planMigration(base: string) {
  const changes: MigrationChange[] = [],
    mapping = new Map<string, string>(),
    oldExercises = new Map(),
    newExercises = new Map();
  const normalized = new Set<string>();
  const implicit = new Map<string, string[]>();
  for (const file of await enumerate(path.join(base, "esercizi"), /\.md$/i)) {
    const before = await fs.readFile(file, "utf8"),
      match = before.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) throw Error(file + ": manca front matter");
    const meta = parsed(match[1]);
    if (!isMap(meta.contents)) throw Error("Front matter non valido");
    const id = relativeId(path.join(base, "esercizi"), file),
      old = String(meta.get("id") ?? id);
    if (normalized.has(id.toLowerCase()))
      throw Error("Collisione percorso: " + id);
    normalized.add(id.toLowerCase());
    if (mapping.has(old)) throw Error("ID duplicato: " + old);
    mapping.set(old, id);
    if (meta.get("id") === undefined) {
      const basename = path.basename(file, ".md");
      implicit.set(basename, [...(implicit.get(basename) ?? []), id]);
    }
    const metadata = applyPatches(
      match[1],
      mapDelete(match[1], meta.contents, "id"),
    );
    const prefix = before.indexOf(match[1]);
    const after =
      before.slice(0, prefix) +
      metadata +
      before.slice(prefix + match[1].length);
    const e = exercise(after, id);
    oldExercises.set(old, { ...e, id: old });
    newExercises.set(id, e);
    if (before !== after) changes.push({ file, before, after });
  }
  let traces = 0;
  const baselineErrors: string[] = [];
  for (const file of await enumerate(
    path.join(base, "verifiche"),
    /\.ya?ml$/i,
  )) {
    const before = await fs.readFile(file, "utf8"),
      s = structure(before);
    const patches = s.references.flatMap((r) => {
      let next = mapping.get(r.id);
      if (!next) {
        const candidates = implicit.get(r.id) ?? [];
        if (candidates.length > 1) throw Error("ID implicito ambiguo: " + r.id);
        next = candidates[0];
        if (next) {
          mapping.set(r.id, next);
          oldExercises.set(r.id, { ...newExercises.get(next), id: r.id });
        }
      }
      if (!next) throw Error(file + ": riferimento mancante " + r.id);
      return next === r.id ? [] : [scalarPatch(r.node, next)];
    });
    const after = applyPatches(before, patches),
      v1 = exam(before),
      v2 = exam(after);
    for (const t of v1.tracce) {
      let oldResult;
      try {
        oldResult = render(v1, String(t.id), { base, exercises: oldExercises });
      } catch (e) {
        baselineErrors.push(`${file} / ${t.id}: ${String(e)}`);
        continue;
      }
      const result = render(v2, String(t.id), {
        base,
        exercises: newExercises,
      });
      if (
        oldResult.html !== result.html ||
        oldResult.total !== result.total ||
        JSON.stringify(oldResult.order.map((id) => mapping.get(id))) !==
          JSON.stringify(result.order)
      )
        throw Error("Migrazione non equivalente: " + file);
      traces++;
    }
    if (before !== after) changes.push({ file, before, after });
  }
  return {
    changes,
    mapping: Object.fromEntries(mapping),
    traces,
    baselineErrors,
  };
}
export async function applyMigration(
  plan: Awaited<ReturnType<typeof planMigration>>,
) {
  for (const c of plan.changes)
    if ((await fs.readFile(c.file, "utf8")) !== c.before)
      throw Error("File modificato durante la migrazione: " + c.file);
  const written: MigrationChange[] = [];
  try {
    for (const c of plan.changes) {
      await fs.writeFile(c.file, c.after);
      written.push(c);
    }
  } catch (error) {
    for (const c of written.reverse())
      if ((await fs.readFile(c.file, "utf8")) === c.after)
        await fs.writeFile(c.file, c.before);
    throw error;
  }
}
