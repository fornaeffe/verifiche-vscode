import fs from "node:fs/promises";
import path from "node:path";
import { exercise, exam, uses, Exercise, Library, safe } from "./core";

export type Reader = (file: string) => Promise<string>;
export const diskRead: Reader = (file) => fs.readFile(file, "utf8");
export function exercisePath(base: string, id: string) {
  if (
    !id ||
    id.includes("\\") ||
    id.startsWith("/") ||
    id.split("/").some((p) => !p || p === "." || p === "..") ||
    /[<>:"|?*\x00-\x1f]/.test(id)
  )
    throw Error("Percorso esercizio non valido: " + id);
  return safe(path.join(base, "esercizi"), id + ".md");
}
export const relativeId = (base: string, file: string) =>
  path
    .relative(base, file)
    .replace(/\\/g, "/")
    .replace(/\.(md|ya?ml)$/i, "");
export async function enumerate(
  dir: string,
  extension: RegExp,
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((e) => {
    if (e.code === "ENOENT") return [];
    throw e;
  });
  const results = await Promise.all(
    entries.map((e) =>
      e.isDirectory()
        ? enumerate(path.join(dir, e.name), extension)
        : e.isFile() && extension.test(e.name)
          ? [path.join(dir, e.name)]
          : [],
    ),
  );
  return results.flat().sort();
}
export interface Snapshot {
  file: string;
  base: string;
  source: string;
  exam: any;
  library: Library;
  sources: Map<string, string>;
}
export class Repository {
  private cache = new Map<string, { source: string; value: Exercise }>();
  constructor(
    public base: string,
    public read: Reader = diskRead,
    private freeze?: () => Reader,
  ) {}
  clear() {
    this.cache.clear();
  }
  async getExercise(id: string) {
    const file = exercisePath(this.base, id),
      source = await this.read(file);
    return this.cachedExercise(file, source, id);
  }
  private cachedExercise(file: string, source: string, id: string) {
    const old = this.cache.get(file);
    if (old?.source === source) return old.value;
    const value = exercise(source, id);
    this.cache.delete(file);
    this.cache.set(file, { source, value });
    while (this.cache.size > 64)
      this.cache.delete(this.cache.keys().next().value!);
    return value;
  }
  async snapshot(file: string): Promise<Snapshot> {
    // One immutable view of sources per operation, even if the caller's buffers later change.
    const read = this.freeze?.() ?? this.read;
    const source = await read(file),
      v = exam(source),
      sources = new Map([[file, source]]),
      exercises = new Map<string, Exercise>();
    for (const id of new Set(uses(v.blocchi).map((u) => u.id as string))) {
      const p = exercisePath(this.base, id),
        s = await read(p);
      sources.set(p, s);
      exercises.set(id, this.cachedExercise(p, s, id));
    }
    return {
      file,
      base: this.base,
      source,
      exam: v,
      library: { base: this.base, exercises },
      sources,
    };
  }
}
