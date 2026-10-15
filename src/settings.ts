import path from "node:path";

export const settingDefaults = {
  defaultVariantName: "base",
  defaultPublicTraceId: "prova",
  defaultFirstTraceId: "1",
  defaultExerciseFileName: "nuovo-esercizio.md",
  outputDirectory: "output",
} as const;

type Setting = keyof typeof settingDefaults;

// Validate only the settings needed by the operation being performed.
export class Settings {
  constructor(private readonly get: (key: Setting) => unknown) {}

  private invalid(key: Setting, reason: string): never {
    throw Error(`Impostazione verifiche.${key}: ${reason}`);
  }

  private text(key: Setting) {
    const configured = this.get(key);
    const value = configured === undefined ? settingDefaults[key] : configured;
    if (typeof value !== "string" || !value.trim() || value !== value.trim())
      return this.invalid(key, "usare un testo non vuoto senza spazi ai bordi");
    return value;
  }

  private identifier(key: Setting) {
    const value = this.text(key);
    if (
      !/^[a-zA-Z0-9_-]+$/.test(value) ||
      [
        "default",
        "undefined",
        "__proto__",
        "constructor",
        "prototype",
      ].includes(value)
    )
      return this.invalid(
        key,
        "usare lettere, numeri, trattini o underscore e un nome non riservato",
      );
    return value;
  }

  variantName() {
    return this.identifier("defaultVariantName");
  }

  traceIds() {
    const publicId = this.identifier("defaultPublicTraceId");
    const firstId = this.identifier("defaultFirstTraceId");
    if (publicId === firstId)
      return this.invalid(
        "defaultFirstTraceId",
        "deve essere diverso da verifiche.defaultPublicTraceId",
      );
    return { publicId, firstId };
  }

  exerciseFileName() {
    const value = this.text("defaultExerciseFileName");
    if (
      !/^.+\.md$/i.test(value) ||
      /[<>:"/\\|?*\x00-\x1f]/.test(value) ||
      /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(value)
    )
      return this.invalid(
        "defaultExerciseFileName",
        "usare un semplice nome di file .md valido anche su Windows",
      );
    return value;
  }

  outputDirectory(root: string) {
    const value = this.text("outputDirectory");
    // Accept native paths, not VS Code variables, URI or shell expansions.
    const parts = value.split(/[\\/]/).filter(Boolean);
    if (
      /[<>"|?*\x00-\x1f]/.test(value) ||
      /\$\{|^~/.test(value) ||
      (value.includes(":") &&
        !(
          process.platform === "win32" &&
          /^[a-zA-Z]:[\\/]/.test(value) &&
          !value.slice(2).includes(":")
        )) ||
      parts.some(
        (part, index) =>
          !(
            process.platform === "win32" &&
            index === 0 &&
            /^[a-zA-Z]:$/.test(part)
          ) &&
          part !== "." &&
          part !== ".." &&
          (/[. ]$/.test(part) ||
            /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part)),
      )
    )
      return this.invalid(
        "outputDirectory",
        "usare un percorso relativo o assoluto valido, senza variabili o URI",
      );
    return path.resolve(root, value);
  }
}
