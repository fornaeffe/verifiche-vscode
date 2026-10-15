import * as vscode from "vscode";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import type { SetupUI } from "../../src/setup-command";
import { locate } from "../../src/host";

export async function checkSetup(extension: vscode.Extension<any>, api: any) {
  const parent = path.dirname(
    vscode.Uri.file(process.env.VERIFICHE_TEST_ROOT!).fsPath,
  );
  const root = path.join(parent, "nuovi dati");
  const asset = path.join(extension.extensionPath, "media/predefinito.css");
  const runSetup = (
    _asset: string,
    dialogs: SetupUI,
    gitInit?: (root: string) => Promise<void>,
  ) => api.setup(dialogs, gitInit);
  const warnings: string[] = [],
    opened: string[] = [];
  const dialogs: SetupUI = {
    async mode() {
      return "new";
    },
    async folder() {
      return vscode.Uri.file(parent);
    },
    async name() {
      return "nuovi dati";
    },
    async git() {
      return false;
    },
    async warn(message) {
      warnings.push(message);
    },
    async open(uri) {
      opened.push(uri.fsPath);
    },
  };
  // Each dismissal happens before all filesystem writes, including the Git choice.
  for (const cancelled of ["mode", "folder", "name", "git"] as const) {
    await runSetup(asset, { ...dialogs, [cancelled]: async () => undefined });
    await assert.rejects(fs.stat(root), { code: "ENOENT" });
  }
  assert.equal(opened.length, 0);
  await runSetup(asset, dialogs);
  assert.deepEqual(opened, [root]);
  assert.deepEqual(warnings, []);
  await assert.rejects(fs.stat(path.join(root, ".git")), { code: "ENOENT" });
  assert.deepEqual(
    await fs.readFile(path.join(root, "stili/predefinito.css")),
    await fs.readFile(asset),
  );
  const original = await fs.readFile(path.join(root, "README.md"));
  await assert.rejects(runSetup(asset, dialogs), /nuova o vuota/);
  assert.deepEqual(await fs.readFile(path.join(root, "README.md")), original);

  const empty = path.join(parent, "vuoti con git");
  await fs.mkdir(empty);
  await runSetup(asset, {
    ...dialogs,
    async mode() {
      return "empty";
    },
    async folder() {
      return vscode.Uri.file(empty);
    },
    async git() {
      return true;
    },
  });
  assert.ok((await fs.stat(path.join(empty, ".git"))).isDirectory());
  const noGit = path.join(parent, "senza-git");
  await fs.mkdir(noGit);
  await runSetup(
    asset,
    {
      ...dialogs,
      async mode() {
        return "empty";
      },
      async folder() {
        return vscode.Uri.file(noGit);
      },
      async git() {
        return true;
      },
    },
    async () => {
      throw Error("Git non disponibile");
    },
  );
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Git non disponibile/);
  assert.equal(opened.at(-1), noGit);
  assert.ok(
    (await fs.stat(path.join(noGit, "contenuti/verifiche"))).isDirectory(),
  );

  // A destination inside the second workspace inherits its resource configuration.
  const second = vscode.Uri.file(
    process.env.VERIFICHE_TEST_SECOND_ROOT!,
  ).fsPath;
  const nested = path.join(second, "nuovi-annidati");
  await runSetup(asset, {
    ...dialogs,
    async folder() {
      return vscode.Uri.file(second);
    },
    async name() {
      return "nuovi-annidati";
    },
  });
  assert.deepEqual(
    JSON.parse(
      await fs.readFile(path.join(nested, ".vscode/settings.json"), "utf8"),
    ),
    { "verifiche.contentDirectory": "archivio/contenuti" },
  );
  // Open the generated default root in this host and use the extension's real commands.
  assert.ok(
    vscode.workspace.updateWorkspaceFolders(
      vscode.workspace.workspaceFolders!.length,
      0,
      { uri: vscode.Uri.file(root) },
    ),
  );
  for (
    let i = 0;
    i < 100 && !vscode.workspace.getWorkspaceFolder(vscode.Uri.file(root));
    i++
  )
    await new Promise((resolve) => setTimeout(resolve, 50));
  const file = vscode.Uri.file(
    path.join(root, "contenuti/verifiche/nuova.yaml"),
  );
  await fs.writeFile(file.fsPath, "");
  assert.equal(locate(file)?.root, root);
  await vscode.commands.executeCommand("verifiche.template", file);
  const doc = await vscode.workspace.openTextDocument(file);
  assert.match(doc.getText(), /titolo: nuova/);
  assert.ok(doc.isDirty);
  console.log(
    "PASS: setup dialogs/cancellation, empty/new roots, collisions, optional/missing Git, nested persisted settings, packaged CSS, generated root and real template command",
  );
}
