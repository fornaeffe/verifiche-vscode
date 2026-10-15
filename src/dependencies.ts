import path from "node:path";

const key = (file: string) => {
  const resolved = path.resolve(file);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

/** Operation-local paths, including dependencies that do not exist yet. */
export class Dependencies {
  private files = new Set<string>();
  constructor(...files: string[]) {
    files.forEach(this.add);
  }
  add = (file: string) => {
    this.files.add(key(file));
  };
  affects(file: string) {
    const changed = key(file);
    // Watchers may report a removed/renamed directory instead of its children.
    return [...this.files].some(
      (dependency) =>
        dependency === changed || dependency.startsWith(changed + path.sep),
    );
  }
}
