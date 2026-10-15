import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export function directoryName(value: string) {
  if (
    !value ||
    value === "." ||
    value === ".." ||
    value !== value.trim() ||
    /[<>:"/\\|?*\x00-\x1f]/.test(value) ||
    /[. ]$/.test(value) ||
    /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(value)
  )
    throw Error(
      "Usare un nome di cartella valido, senza separatori di percorso.",
    );
  return value;
}

export function contentDirectory(value: unknown): string {
  const invalid = () =>
    Error(
      "Impostazione verifiche.contentDirectory: usare un percorso relativo interno alla cartella dati, senza . o .. e senza cartelle riservate (stili, output, .git, .vscode).",
    );
  if (typeof value !== "string" || /\$\{|^~/.test(value)) throw invalid();
  const parts = value.replaceAll("\\", "/").split("/");
  try {
    parts.forEach(directoryName);
  } catch {
    throw invalid();
  }
  if (
    ["stili", "output", ".git", ".vscode", "readme.md", ".gitignore"].includes(
      parts[0].toLowerCase(),
    )
  )
    throw invalid();
  return parts.join("/");
}

export async function createDataFolder(
  root: string,
  cssFile: string,
  configured: unknown = "contenuti",
) {
  root = path.resolve(root);
  const directory = contentDirectory(configured);
  // Read installation assets and validate everything before touching the destination.
  const css = await fs.readFile(cssFile);
  const files = new Map<string, string | Buffer>([
    ...["esercizi", "verifiche", "allegati"].map((kind): [string, string] => [
      `${directory}/${kind}/.gitkeep`,
      "",
    ]),
    ["stili/predefinito.css", css],
    [".gitignore", "/output/\n"],
    [
      "README.md",
      `# Dati delle verifiche

Aprire questa cartella con VS Code e l'estensione Verifiche installata.

- \`${directory}/esercizi/\`: esercizi Markdown, anche in sottocartelle.
- \`${directory}/verifiche/\`: verifiche YAML.
- \`${directory}/allegati/\`: immagini locali.
- \`stili/predefinito.css\`: stile personalizzabile per anteprima e PDF;
  sostituisce quello incluso nell'estensione. È possibile aggiungere proprie classi CSS.
- \`output/\`: PDF generati, esclusi da Git con la destinazione predefinita.
  Se si cambia destinazione, aggiornare anche \`.gitignore\` quando necessario.

Creare un file vuoto nelle cartelle esercizi o verifiche e usare
**Verifiche: Inserisci template**. Gli ID esercizio sono percorsi relativi
alla cartella esercizi, senza \`.md\`: non aggiungere ID al front matter.

Per il primo PDF usare **Verifiche: Installa Chromium per i PDF** se richiesto;
dopo il setup si può lavorare offline. Per gli altri comandi consultare il README
dell'estensione nella scheda Extensions di VS Code.

Conservare contenuti e stili nei backup. Git è facoltativo; la creazione della
cartella non esegue commit né pubblicazioni remote.
`,
    ],
  ]);
  if (directory !== "contenuti")
    files.set(
      ".vscode/settings.json",
      JSON.stringify({ "verifiche.contentDirectory": directory }, null, 2) +
        "\n",
    );
  const existing = await fs.lstat(root).catch((e) => {
    if (e.code !== "ENOENT") throw e;
    return undefined;
  });
  if (existing && (!existing.isDirectory() || (await fs.readdir(root)).length))
    throw Error(
      "Scegliere una cartella nuova o vuota: nessun file è stato modificato.",
    );
  const createdDirectories: string[] = [],
    createdFiles: string[] = [];
  const made = new Set<string>();
  const mkdir = async (relative: string) => {
    if (made.has(relative)) return;
    await fs.mkdir(path.join(root, relative));
    made.add(relative);
    createdDirectories.push(relative || ".");
  };
  try {
    if (!existing) await mkdir("");
    for (const [relative, text] of files) {
      const parts = relative.split("/").slice(0, -1);
      for (let i = 1; i <= parts.length; i++)
        await mkdir(parts.slice(0, i).join("/"));
      // Exclusive creation also protects against files appearing after the initial check.
      const handle = await fs.open(path.join(root, relative), "wx");
      createdFiles.push(relative);
      try {
        await handle.writeFile(text);
      } finally {
        await handle.close();
      }
    }
  } catch (e) {
    throw Error(
      `Creazione interrotta in ${root}: ${e instanceof Error ? e.message : e}\nFile creati: ${createdFiles.join(", ") || "nessuno"}.\nCartelle create: ${createdDirectories.join(", ") || "nessuna"}. I file presenti non sono stati sovrascritti.`,
      { cause: e },
    );
  }
  return { root, directory, files: createdFiles };
}

export async function initializeGit(root: string) {
  // Do not inherit a repository or index from the Extension Host's environment.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.toUpperCase().startsWith("GIT_"),
    ),
  );
  await promisify(execFile)("git", ["-C", root, "init"], {
    env,
    windowsHide: true,
    timeout: 15000,
  });
}
