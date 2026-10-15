import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  contentDirectory,
  createDataFolder,
  initializeGit,
} from "../src/setup";

const css = path.resolve("media/predefinito.css");
async function temporary(run: (parent: string) => Promise<void>) {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "verifiche-setup-"));
  try {
    await run(parent);
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
}

test("creazione dati autonoma, CSS incluso e nessun esempio o output", async () => {
  await temporary(async (parent) => {
    const root = path.join(parent, "dati");
    const result = await createDataFolder(root, css);
    assert.equal(result.directory, "contenuti");
    assert.deepEqual((await fs.readdir(root)).sort(), [
      ".gitignore",
      "README.md",
      "contenuti",
      "stili",
    ]);
    for (const kind of ["esercizi", "verifiche", "allegati"])
      assert.deepEqual(await fs.readdir(path.join(root, "contenuti", kind)), [
        ".gitkeep",
      ]);
    assert.deepEqual(
      await fs.readFile(path.join(root, "stili/predefinito.css")),
      await fs.readFile(css),
    );
    assert.equal(
      await fs.readFile(path.join(root, ".gitignore"), "utf8"),
      "/output/\n",
    );
    await assert.rejects(createDataFolder(root, css), /nuova o vuota/);
    assert.deepEqual(
      await fs.readFile(path.join(root, "stili/predefinito.css")),
      await fs.readFile(css),
    );
  });
});

test("cartella vuota e contenuti annidati con configurazione persistente", async () => {
  await temporary(async (root) => {
    await createDataFolder(root, css, "archivio\\contenuti");
    assert.ok(
      (
        await fs.stat(path.join(root, "archivio/contenuti/esercizi"))
      ).isDirectory(),
    );
    assert.deepEqual(
      JSON.parse(
        await fs.readFile(path.join(root, ".vscode/settings.json"), "utf8"),
      ),
      { "verifiche.contentDirectory": "archivio/contenuti" },
    );
    assert.match(
      await fs.readFile(path.join(root, "README.md"), "utf8"),
      /archivio\/contenuti\/esercizi/,
    );
  });
});

test("percorsi invalidi, collisioni e asset assenti non producono scritture", async () => {
  await temporary(async (parent) => {
    const root = path.join(parent, "nuovi");
    for (const value of [
      "",
      ".",
      "..",
      "../fuori",
      "/tmp",
      "C:\\dati",
      "a/../b",
      "a//b",
      "a/CON",
      "a/termine.",
      " a",
      "${workspaceFolder}/dati",
      "~/dati",
      "stili",
      "OUTPUT/dati",
      ".git/dati",
      ".vscode/dati",
      3,
      null,
    ]) {
      assert.throws(
        () => contentDirectory(value),
        /verifiche\.contentDirectory/,
      );
      await assert.rejects(createDataFolder(root, css, value));
    }
    await assert.rejects(fs.stat(root), { code: "ENOENT" });
    await assert.rejects(
      createDataFolder(root, path.join(parent, "inesistente.css")),
    );
    await assert.rejects(fs.stat(root), { code: "ENOENT" });
    await fs.writeFile(root, "da preservare");
    await assert.rejects(createDataFolder(root, css), /nuova o vuota/);
    assert.equal(await fs.readFile(root, "utf8"), "da preservare");
    await fs.writeFile(path.join(parent, "personale.md"), "immutato");
    await assert.rejects(createDataFolder(parent, css), /nuova o vuota/);
    assert.equal(
      await fs.readFile(path.join(parent, "personale.md"), "utf8"),
      "immutato",
    );
  });
});

test("errore parziale elenca i risultati senza eliminare né sovrascrivere file", async () => {
  await temporary(async (parent) => {
    const root = path.join(parent, "dati");
    // Simulate a concurrent creator, after the initial empty-directory check.
    const original = fs.open;
    fs.open = (async (file: Parameters<typeof fs.open>[0], ...args: any[]) => {
      if (String(file) === path.join(root, "stili/predefinito.css"))
        await fs.writeFile(file, "creato da un altro processo");
      return (original as any)(file, ...args);
    }) as typeof fs.open;
    try {
      await assert.rejects(
        createDataFolder(root, css),
        /File creati: contenuti\/esercizi\/\.gitkeep.*Cartelle create:/s,
      );
    } finally {
      fs.open = original;
    }
    assert.equal(
      await fs.readFile(path.join(root, "stili/predefinito.css"), "utf8"),
      "creato da un altro processo",
    );
    assert.ok(
      (await fs.stat(path.join(root, "contenuti/esercizi/.gitkeep"))).isFile(),
    );
  });
});

test("Git facoltativo crea solo il repository locale e ignora gli output", async () => {
  await temporary(async (parent) => {
    const root = path.join(parent, "dati con spazi");
    await createDataFolder(root, css);
    await initializeGit(root);
    const git = async (...args: string[]) =>
      (await promisify(execFile)("git", ["-C", root, ...args])).stdout.trim();
    assert.equal(
      await git("rev-parse", "--show-toplevel"),
      root.replaceAll("\\", "/"),
    );
    assert.equal(await git("remote"), "");
    await assert.rejects(git("rev-parse", "HEAD"));
    await fs.mkdir(path.join(root, "output"));
    await fs.writeFile(path.join(root, "output/prova.pdf"), "sintetico");
    assert.equal(
      await git("check-ignore", "output/prova.pdf"),
      "output/prova.pdf",
    );
  });
});
