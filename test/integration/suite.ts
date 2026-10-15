import * as vscode from "vscode";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import { structure } from "../../src/document";
import { checkSettings } from "./settings";
import { checkDependencies } from "./dependencies";
import { checkSetup } from "./setup";
import { checkStyleDocuments } from "./styles";
import { checkRandomOrder } from "./random-order";

export async function run() {
  const root = process.env.VERIFICHE_TEST_ROOT!;
  const extension = vscode.extensions.getExtension(
    "fornaeffe.verifiche-vscode",
  );
  assert.ok(extension);
  // The guide is available from the installed package without an active data file.
  assert.ok(
    extension.packageJSON.contributes.commands.some(
      (command: { command: string }) =>
        command.command === "verifiche.openGuide",
    ),
  );
  const guide = vscode.Uri.joinPath(
    extension.extensionUri,
    "docs",
    "README.md",
  );
  assert.match(
    Buffer.from(await vscode.workspace.fs.readFile(guide)).toString("utf8"),
    /Manuale di Verifiche/,
  );
  await vscode.commands.executeCommand("verifiche.openGuide");
  const guideTab = vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .find(
      (tab) =>
        tab.input instanceof vscode.TabInputWebview &&
        tab.label.includes("README.md"),
    );
  assert.ok(guideTab, "The bundled Markdown guide must open as a preview");
  await vscode.window.tabGroups.close(guideTab);
  assert.ok(
    extension.packageJSON.contributes.commands.some(
      (command: { command: string }) =>
        command.command === "verifiche.createDataFolder",
    ),
  );
  // Exercise the actual command with no active document; the UI runner dismisses it.
  if (process.env.VERIFICHE_UI_TEST) {
    await fs.writeFile(
      path.join(process.env.VERIFICHE_UI_TEST, "ui-ready-setup"),
      "ready",
    );
    await vscode.commands.executeCommand("verifiche.createDataFolder");
  }
  const api = await extension.activate();
  assert.ok(
    (await vscode.commands.getCommands()).includes(
      "verifiche.createDataFolder",
    ),
  );
  // Check the installed VS Code defaults, including bundled extensions.
  await vscode.commands.executeCommand(
    "workbench.action.openDefaultKeybindingsFile",
  );
  const defaults = vscode.window.activeTextEditor!.document.getText();
  const key =
    process.platform === "darwin" ? "cmd+k cmd+alt+h" : "ctrl+k ctrl+alt+h";
  const bindings = JSON.parse(defaults.replace(/^\s*\/\/.*$/gm, ""));
  const conflicts = bindings.filter(
    (binding: { key: string; command: string }) =>
      binding.command !== "verifiche.insertChemicalFormula" &&
      (binding.key === key || binding.key.startsWith(key + " ")),
  );
  assert.deepEqual(
    conflicts,
    [],
    "Chemical formula shortcut conflicts with a default binding",
  );
  const examUri = vscode.Uri.file(
    path.join(root, "contenuti/verifiche/esempio.yaml"),
  );
  const doc = await vscode.workspace.openTextDocument(examUri);
  await vscode.window.showTextDocument(doc);
  const original = doc.getText();
  const checkChemicalFormula = async (document: vscode.TextDocument) => {
    const editor = await vscode.window.showTextDocument(document);
    const before = document.getText();
    const position = document.positionAt(before.length);
    editor.selection = new vscode.Selection(position, position);
    await vscode.commands.executeCommand("verifiche.insertChemicalFormula");
    assert.equal(document.getText(), before + "$\\ce{}$");
    assert.ok(editor.selection.isEmpty);
    assert.equal(document.offsetAt(editor.selection.active), before.length + 5);
    await vscode.commands.executeCommand("type", { text: "H2O" });
    assert.equal(document.getText(), before + "$\\ce{H2O}$");
    await vscode.commands.executeCommand("undo");
    assert.equal(document.getText(), before + "$\\ce{}$");
    await vscode.commands.executeCommand("undo");
    assert.equal(document.getText(), before);
    await vscode.commands.executeCommand("redo");
    assert.equal(document.getText(), before + "$\\ce{}$");
    await vscode.commands.executeCommand("undo");
    assert.equal(document.getText(), before);
  };
  await checkChemicalFormula(doc);
  const exerciseDocument = await vscode.workspace.openTextDocument(
    vscode.Uri.file(path.join(root, "contenuti/esercizi/scienze/esempio.md")),
  );
  await checkChemicalFormula(exerciseDocument);
  if (process.env.VERIFICHE_UI_TEST) {
    const editor = await vscode.window.showTextDocument(exerciseDocument);
    const before = exerciseDocument.getText();
    const position = exerciseDocument.positionAt(before.length);
    editor.selection = new vscode.Selection(position, position);
    const temp = process.env.VERIFICHE_UI_TEST;
    await fs.writeFile(path.join(temp, "ui-ready-formula"), "ready");
    const deadline = Date.now() + 30000;
    while (
      (!exerciseDocument.getText().endsWith("$\\ce{}$") ||
        exerciseDocument.offsetAt(editor.selection.active) !==
          before.length + 5) &&
      Date.now() < deadline
    )
      await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(exerciseDocument.getText(), before + "$\\ce{}$");
    assert.equal(
      exerciseDocument.offsetAt(editor.selection.active),
      before.length + 5,
    );
    await vscode.commands.executeCommand("undo");
    assert.equal(exerciseDocument.getText(), before);
  }
  const unrelated = await vscode.workspace.openTextDocument({
    language: "markdown",
    content: "Unrelated document",
  });
  await vscode.window.showTextDocument(unrelated);
  await vscode.commands.executeCommand("verifiche.insertChemicalFormula");
  assert.equal(unrelated.getText(), "Unrelated document");
  await vscode.window.showTextDocument(doc);
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
  const exerciseOriginal = exerciseDocument.getText();
  const availableVariant =
    "\n:::variante terza\nDomanda nel buffer non salvato.\n:::\n";
  const exerciseEdit = new vscode.WorkspaceEdit();
  exerciseEdit.insert(
    exerciseDocument.uri,
    exerciseDocument.positionAt(exerciseOriginal.length),
    availableVariant,
  );
  assert.ok(await vscode.workspace.applyEdit(exerciseEdit));
  assert.ok(exerciseDocument.isDirty);
  await vscode.window.showTextDocument(doc);
  await vscode.commands.executeCommand("verifiche.addTrace", doc.uri);
  const assigned = doc.getText();
  assert.equal(structure(assigned).references[0].versions!.get("2"), "terza");
  assert.equal(structure(assigned).doc.toJS().tracce.length, 3);
  await vscode.commands.executeCommand("undo");
  assert.equal(doc.getText(), original);
  await vscode.commands.executeCommand("redo");
  assert.equal(doc.getText(), assigned);
  await vscode.commands.executeCommand("verifiche.addTrace", doc.uri);
  assert.equal(structure(doc.getText()).references[0].versions!.get("3"), "");
  await vscode.commands.executeCommand("undo");
  assert.equal(doc.getText(), assigned);
  await vscode.commands.executeCommand("undo");
  assert.equal(doc.getText(), original);
  await vscode.window.showTextDocument(exerciseDocument);
  await vscode.commands.executeCommand("undo");
  assert.equal(exerciseDocument.getText(), exerciseOriginal);
  await vscode.window.showTextDocument(doc);
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
  assert.equal(structure(doc.getText()).references[1].usage.get("punti"), 1);
  await vscode.window.showTextDocument(doc);
  await vscode.commands.executeCommand("undo");
  assert.equal(doc.getText(), original);
  await vscode.commands.executeCommand("redo");
  assert.equal(structure(doc.getText()).references[1].usage.get("punti"), 1);
  await vscode.commands.executeCommand("undo");
  assert.equal(doc.getText(), original);
  const config = vscode.workspace.getConfiguration("verifiche", doc.uri);
  const previousDefaultPoints = config.inspect<boolean>(
    "defaultExercisePoints",
  )?.workspaceValue;
  assert.equal(config.get("defaultExercisePoints"), true);
  try {
    await config.update(
      "defaultExercisePoints",
      false,
      vscode.ConfigurationTarget.Workspace,
    );
    const withoutPoints = await api.transfers.provideDocumentDropEdits(
      doc,
      doc.positionAt(referenceOffset + 2),
      data,
      new vscode.CancellationTokenSource().token,
    );
    assert.ok(withoutPoints?.additionalEdit);
    assert.ok(await vscode.workspace.applyEdit(withoutPoints.additionalEdit));
    const refs = structure(doc.getText()).references;
    assert.equal(refs[1].usage.has("punti"), false);
    assert.equal(refs[0].usage.get("punti"), 2);
    await vscode.commands.executeCommand("undo");
    assert.equal(doc.getText(), original);
    await config.update(
      "defaultExercisePoints",
      true,
      vscode.ConfigurationTarget.Workspace,
    );
    const withPoints = await api.transfers.provideDocumentDropEdits(
      doc,
      doc.positionAt(referenceOffset + 2),
      data,
      new vscode.CancellationTokenSource().token,
    );
    assert.ok(withPoints?.additionalEdit);
    assert.ok(await vscode.workspace.applyEdit(withPoints.additionalEdit));
    assert.equal(structure(doc.getText()).references[1].usage.get("punti"), 1);
    await vscode.commands.executeCommand("undo");
    assert.equal(doc.getText(), original);
  } finally {
    await config.update(
      "defaultExercisePoints",
      previousDefaultPoints,
      vscode.ConfigurationTarget.Workspace,
    );
  }
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
    const waitForUi = async (name: string) => {
      const deadline = Date.now() + 30000;
      let result = "";
      while (Date.now() < deadline) {
        try {
          result = await fs.readFile(path.join(temp, name), "utf8");
          break;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      assert.equal(result, "ok");
    };
    const visibleCopies = () =>
      vscode.window.visibleTextEditors.filter(
        (editor) => editor.document.uri.toString() === doc.uri.toString(),
      ).length;

    await vscode.window.showTextDocument(doc);
    assert.equal(visibleCopies(), 1);
    await vscode.commands.executeCommand(
      chooseVariant.command.command,
      ...(chooseVariant.command.arguments ?? []),
    );
    await fs.writeFile(path.join(temp, "ui-ready-cancel"), "ready");
    await waitForUi("ui-done-cancel");
    assert.equal(doc.getText(), original);
    assert.equal(visibleCopies(), 1);
    assert.match(api.preview.panel.webview.html, /Esporta PDF/);

    await vscode.commands.executeCommand(
      chooseVariant.command.command,
      ...(chooseVariant.command.arguments ?? []),
    );
    await fs.writeFile(path.join(temp, "ui-ready-select"), "ready");
    await waitForUi("ui-done-select");
    for (let i = 0; i < 50 && !/prova: seconda/.test(doc.getText()); i++)
      await new Promise((resolve) => setTimeout(resolve, 100));
    assert.match(doc.getText(), /prova: seconda/);
    assert.equal(visibleCopies(), 1);
    assert.match(api.preview.panel.webview.html, /Esporta PDF/);
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
  // The command must prepare all assignments before changing the exam.
  const brokenUri = vscode.Uri.file(
    path.join(root, "contenuti/verifiche/errore.yaml"),
  );
  const brokenSource = `titolo: Test errori
tracce: [{id: prova}]
blocchi:
  - esercizio: scienze/esempio
    versioni: {prova: base}
  - esercizio: mancante
    versioni: {prova: base}
`;
  await vscode.workspace.fs.writeFile(brokenUri, Buffer.from(brokenSource));
  const brokenDoc = await vscode.workspace.openTextDocument(brokenUri);
  await vscode.window.showTextDocument(brokenDoc);
  await vscode.commands.executeCommand("verifiche.addTrace", brokenUri);
  assert.equal(brokenDoc.getText(), brokenSource);
  assert.equal(brokenDoc.isDirty, false);
  const invalidUri = vscode.Uri.file(
    path.join(root, "contenuti/esercizi/mancante.md"),
  );
  await vscode.workspace.fs.writeFile(
    invalidUri,
    Buffer.from("---\ntipo: A\n---\nTesto senza varianti\n"),
  );
  await vscode.commands.executeCommand("verifiche.addTrace", brokenUri);
  assert.equal(brokenDoc.getText(), brokenSource);
  assert.equal(brokenDoc.isDirty, false);
  await checkDependencies(api);
  await checkSettings(api.preview);
  await checkStyleDocuments(api.preview, extension.extensionPath);
  await checkSetup(extension, api);
  await checkRandomOrder(api);
  api.preview.dispose();
  console.log(
    "PASS: activation, chemical formula command/keyboard/cursor/undo/redo and default binding conflicts, reduced CodeLens, contextual Code Actions, picker cancel/select without duplicate editors, trace auto-assignment/unsaved buffers/exhaustion/undo/redo/read errors, definition, template, focus preview, exercise drop/default points/settings/undo/redo, image paste, rename references",
  );
}
