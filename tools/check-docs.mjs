import fs from "node:fs/promises";
import path from "node:path";
import MarkdownIt from "markdown-it";

// With a directory argument, check the extracted VSIX instead of repository docs.
const packaged = !!process.argv[2];
const root = path.resolve(process.argv[2] ?? ".");
const md = new MarkdownIt();
const errors = [];
const documents = new Map();
const walk = async (dir) => {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(file)));
    else if (entry.name.endsWith(".md")) files.push(file);
  }
  return files;
};
const files = [
  ...(await fs.readdir(root))
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.join(root, name)),
  ...(await walk(path.join(root, "docs"))),
].filter((file) => !file.includes(path.join("esempi", "contenuti")));

const parse = async (file) => {
  if (documents.has(file)) return documents.get(file);
  const source = await fs.readFile(file, "utf8");
  const tokens = md.parse(source, {});
  const anchors = new Set();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "heading_open") continue;
    const title = (tokens[i + 1].children ?? [])
      .filter((token) => ["text", "code_inline"].includes(token.type))
      .map((token) => token.content)
      .join("");
    const slug = title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_\-\s]/gu, "")
      .replace(/\s/g, "-");
    let anchor = slug,
      suffix = 0;
    while (anchors.has(anchor)) anchor = `${slug}-${++suffix}`;
    anchors.add(anchor);
  }
  const result = { source, tokens, anchors };
  documents.set(file, result);
  return result;
};

let links = 0;
for (const file of files) {
  const { tokens } = await parse(file);
  const check = async (token) => {
    const href =
      token.type === "link_open"
        ? token.attrGet("href")
        : token.type === "image"
          ? token.attrGet("src")
          : undefined;
    if (href && !/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      links++;
      const [name, fragment] = href.split("#");
      const target = name
        ? path.resolve(path.dirname(file), decodeURIComponent(name))
        : file;
      const relative = path.relative(root, target);
      try {
        if (relative.startsWith("..") || path.isAbsolute(relative))
          throw Error("fuori dalla radice");
        await fs.access(target);
        // Windows access is case-insensitive; packaged links must also work on Linux.
        let directory = root;
        for (const part of relative.split(path.sep).filter(Boolean)) {
          if (!(await fs.readdir(directory)).includes(part))
            throw Error("nome con maiuscole/minuscole non corrispondenti");
          directory = path.join(directory, part);
        }
        if (
          fragment &&
          target.endsWith(".md") &&
          !(await parse(target)).anchors.has(decodeURIComponent(fragment))
        )
          throw Error("ancora inesistente");
      } catch (error) {
        errors.push(`${path.relative(root, file)}: ${href} (${error.message})`);
      }
    }
    for (const child of token.children ?? []) await check(child);
  };
  for (const token of tokens) await check(token);
}

const manifest = JSON.parse(
  await fs.readFile(path.join(root, "package.json"), "utf8"),
);
const reference = (
  await parse(path.join(root, "docs/riferimento/comandi-impostazioni.md"))
).source;
for (const id of [
  ...manifest.contributes.commands.map((command) => command.command),
  ...Object.keys(manifest.contributes.configuration.properties),
]) {
  if (!reference.includes("`" + id + "`"))
    errors.push(`Voce manifest non documentata: ${id}`);
}

if (packaged) {
  const forbidden = [
    "CONTRIBUTING.md",
    "AGENTS.md",
    "TODO.md",
    "docs/ARCHITECTURE.md",
    "docs/cli.md",
    "docs/distribuzione.md",
    "docs/archivio-implementazione",
  ];
  for (const name of forbidden) {
    const exists = await fs.access(path.join(root, name)).then(
      () => true,
      () => false,
    );
    if (exists) errors.push(`Documento di sviluppo incluso nel VSIX: ${name}`);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `PASS: ${files.length} documenti, ${links} collegamenti locali e copertura comandi/impostazioni${packaged ? ", separazione documenti VSIX" : ""}`,
  );
}
