import * as vscode from "vscode";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";

export async function run() {
  const root = process.env.VERIFICHE_TEST_ROOT!;
  const extension = vscode.extensions.getExtension(
    "fornaeffe.verifiche-vscode",
  );
  assert.ok(extension);
  const api = await extension.activate();
  const examUri = vscode.Uri.file(
    path.join(root, "contenuti/verifiche/esempio.yaml"),
  );
  const doc = await vscode.workspace.openTextDocument(examUri);
  await vscode.window.showTextDocument(doc);
  const original = doc.getText();
  const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
    "vscode.executeCodeLensProvider",
    doc.uri,
  );
  assert.ok(lenses?.some((l) => l.command?.command === "verifiche.addTrace"));
  for (const removed of [
    "verifiche.deleteTrace",
    "verifiche.renameTrace",
    "verifiche.duplicateTrace",
    "verifiche.chooseVariant",
  ])
    assert.ok(!lenses?.some((l) => l.command?.command === removed));

  const actionsAt = (offset: number) => {
    const position = doc.positionAt(offset);
    return vscode.commands.executeCommand<vscode.CodeAction[]>(
      "vscode.executeCodeActionProvider",
      doc.uri,
      new vscode.Range(position, position),
    );
  };
  const traceActions = await actionsAt(original.indexOf("- id: prova") + 6);
  assert.deepEqual(
    traceActions
      .map((action) => action.command?.command)
      .filter((command) => command?.endsWith("Trace"))
      .sort(),
    [
      "verifiche.deleteTrace",
      "verifiche.duplicateTrace",
      "verifiche.renameTrace",
    ],
  );
  const versionActions = await actionsAt(original.indexOf("prova: base") + 2);
  const chooseVariant = versionActions.find(
    (action) => action.command?.command === "verifiche.chooseVariant",
  );
  assert.ok(chooseVariant?.command);
  assert.equal(chooseVariant.command.arguments?.[2], "prova");

  await vscode.commands.executeCommand("verifiche.addTrace", doc.uri);
  assert.match(doc.getText(), /"?2"?:\s*(?:''|"")/);
  await vscode.commands.executeCommand("undo");
  assert.equal(doc.getText(), original);
  const referenceOffset = doc.getText().indexOf("scienze/esempio");
  const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
    "vscode.executeDefinitionProvider",
    doc.uri,
    doc.positionAt(referenceOffset + 2),
  );
  assert.equal(
    definitions?.[0].uri.toString(),
    vscode.Uri.file(
      path.join(root, "contenuti/esercizi/scienze/esempio.md"),
    ).toString(),
  );
  const blank = vscode.Uri.file(path.join(root, "contenuti/esercizi/nuovo.md"));
  await vscode.workspace.fs.writeFile(blank, new Uint8Array());
  const empty = await vscode.workspace.openTextDocument(blank);
  await vscode.window.showTextDocument(empty);
  await vscode.commands.executeCommand("verifiche.template", empty.uri);
  assert.match(empty.getText(), /:::variante base/);
  assert.doesNotMatch(empty.getText(), /^id:/m);
  await api.preview.show(empty, true);
  assert.equal(api.preview.document.uri.toString(), empty.uri.toString());
  assert.match(api.preview.panel.webview.html, /base/);
  await api.preview.show(doc, true);
  assert.equal(api.preview.document.uri.toString(), doc.uri.toString());
  assert.match(api.preview.panel.webview.html, /Esporta PDF/);
  const data = new vscode.DataTransfer();
  data.set(
    "text/uri-list",
    new vscode.DataTransferItem(definitions![0].uri.toString()),
  );
  const drop = await api.transfers.provideDocumentDropEdits(
    doc,
    doc.positionAt(referenceOffset + 2),
    data,
    new vscode.CancellationTokenSource().token,
  );
  assert.ok(drop?.additionalEdit);
  await vscode.workspace.applyEdit(drop.additionalEdit);
  assert.equal((doc.getText().match(/scienze\/esempio/g) || []).length, 2);
  await vscode.window.showTextDocument(doc);
  await vscode.commands.executeCommand("undo");
  assert.equal(doc.getText(), original);
  const imageData = new vscode.DataTransfer();
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7S8AAAAASUVORK5CYII=",
    "base64",
  );
  imageData.set("image/png", {
    value: bytes,
    asString: async () => "",
    asFile: () => ({ name: "test.png", data: async () => bytes }),
  });
  const paste = await api.transfers.provideDocumentPasteEdits(
    empty,
    [new vscode.Range(0, 0, 0, 0)],
    imageData,
    {},
    new vscode.CancellationTokenSource().token,
  );
  assert.ok(paste?.[0].additionalEdit);
  assert.match(paste[0].insertText, /\/allegati\/test-/);
  await vscode.workspace.applyEdit(paste[0].additionalEdit);
  const name = /\/allegati\/([^)]+)/.exec(paste[0].insertText)![1];
  assert.equal(
    (
      await vscode.workspace.fs.readFile(
        vscode.Uri.file(path.join(root, "contenuti/allegati", name)),
      )
    ).length,
    bytes.length,
  );
  if (process.env.VERIFICHE_UI_TEST) {
    const temp = process.env.VERIFICHE_UI_TEST;
    await vscode.window.showTextDocument(doc);
    await vscode.commands.executeCommand(
      chooseVariant.command.command,
      ...(chooseVariant.command.arguments ?? []),
    );
    await fs.writeFile(path.join(temp, "ui-ready"), "ready");
    const deadline = Date.now() + 30000;
    let result = "";
    while (Date.now() < deadline) {
      try {
        result = await fs.readFile(path.join(temp, "ui-done"), "utf8");
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    assert.equal(result, "ok");
    for (let i = 0; i < 50 && !/prova: seconda/.test(doc.getText()); i++)
      await new Promise((r) => setTimeout(r, 100));
    assert.match(doc.getText(), /prova: seconda/);
  }
  const old = definitions![0].uri,
    next = vscode.Uri.file(
      path.join(root, "contenuti/esercizi/scienze/rinominato.md"),
    );
  const edits = new vscode.WorkspaceEdit();
  edits.renameFile(old, next);
  assert.ok(await vscode.workspace.applyEdit(edits));
  assert.match(doc.getText(), /scienze\/rinominato/);
  await vscode.window.showTextDocument(doc);
  await vscode.commands.executeCommand("undo");
  assert.match(doc.getText(), /scienze\/esempio/);
  await vscode.workspace.fs.stat(old);
  api.preview.dispose();
  console.log(
    "PASS: activation, reduced CodeLens, contextual Code Actions, trace edit/undo, definition, template, focus preview, exercise drop/undo, image paste, rename references",
  );
}
