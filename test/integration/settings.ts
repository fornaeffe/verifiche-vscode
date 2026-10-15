import * as vscode from "vscode";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import { exam, exercise } from "../../src/core";
import { locate, settings } from "../../src/host";

export async function checkSettings(preview: any) {
  const root = vscode.Uri.file(process.env.VERIFICHE_TEST_ROOT!).fsPath;
  const secondRoot = vscode.Uri.file(
    process.env.VERIFICHE_TEST_SECOND_ROOT!,
  ).fsPath;
  const createEmpty = async (file: string) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "");
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    await vscode.window.showTextDocument(doc, { preview: false });
    return doc;
  };
  const firstExercise = await createEmpty(
    path.join(root, "contenuti/esercizi/settings.md"),
  );
  const firstExam = await createEmpty(
    path.join(root, "contenuti/verifiche/sotto/settings.yaml"),
  );
  const secondExercise = await createEmpty(
    path.join(secondRoot, "archivio/contenuti/esercizi/settings.md"),
  );
  const secondExam = await createEmpty(
    path.join(secondRoot, "archivio/contenuti/verifiche/sotto/settings.yaml"),
  );
  const firstConfig = vscode.workspace.getConfiguration(
    "verifiche",
    firstExam.uri,
  );
  const secondConfig = vscode.workspace.getConfiguration(
    "verifiche",
    secondExam.uri,
  );
  const update = (
    config: vscode.WorkspaceConfiguration,
    key: string,
    value: unknown,
  ) => config.update(key, value, vscode.ConfigurationTarget.WorkspaceFolder);
  const changed = [
    "defaultVariantName",
    "defaultPublicTraceId",
    "defaultFirstTraceId",
    "defaultExerciseFileName",
    "outputDirectory",
  ];
  const previous = changed.map(
    (key) => firstConfig.inspect(key)?.workspaceFolderValue,
  );
  const secondOutput =
    secondConfig.inspect("outputDirectory")?.workspaceFolderValue;
  try {
    assert.equal(settings(firstExercise.uri).variantName(), "base");
    assert.equal(
      settings(firstExercise.uri).exerciseFileName(),
      "nuovo-esercizio.md",
    );
    await update(firstConfig, "defaultVariantName", "iniziale");
    await update(firstConfig, "defaultPublicTraceId", "esempio");
    await update(firstConfig, "defaultFirstTraceId", "A");
    await update(firstConfig, "defaultExerciseFileName", "domanda.md");
    await update(firstConfig, "outputDirectory", "pdf/primo");
    assert.equal(settings(firstExercise.uri).exerciseFileName(), "domanda.md");
    assert.equal(settings(secondExercise.uri).exerciseFileName(), "secondo.md");
    for (const [doc, variant] of [
      [firstExercise, "iniziale"],
      [secondExercise, "seconda"],
    ] as const) {
      assert.ok(
        locate(doc.uri),
        `Documento non riconosciuto: ${doc.uri.fsPath}`,
      );
      await vscode.commands.executeCommand("verifiche.template", doc.uri);
      assert.ok(doc.getText(), `Template vuoto: ${doc.uri.fsPath}`);
      assert.deepEqual(exercise(doc.getText()).variantOrder, [variant]);
      assert.ok(doc.isDirty);
    }
    for (const [doc, publicId, firstId] of [
      [firstExam, "esempio", "A"],
      [secondExam, "modello", "Z"],
    ] as const) {
      await vscode.commands.executeCommand("verifiche.template", doc.uri);
      assert.deepEqual(exam(doc.getText()).tracce, [
        { id: publicId, pubblica: true },
        { id: firstId },
      ]);
      assert.ok(doc.isDirty);
    }
    const exportAndCheck = async (
      doc: vscode.TextDocument,
      command: string,
      expected: string[],
    ) => {
      await preview.show(doc, true);
      const files = await vscode.commands.executeCommand<string[]>(command);
      assert.deepEqual(files, expected);
      for (const file of expected)
        assert.equal(
          (await fs.readFile(file)).subarray(0, 5).toString(),
          "%PDF-",
        );
    };
    await exportAndCheck(
      firstExam,
      "verifiche.exportAll",
      ["esempio", "A"].map((id) =>
        path.join(root, `pdf/primo/sotto/settings/traccia-${id}.pdf`),
      ),
    );
    await exportAndCheck(
      secondExam,
      "verifiche.exportAll",
      ["modello", "Z"].map((id) =>
        path.join(secondRoot, `pdf/secondo/sotto/settings/traccia-${id}.pdf`),
      ),
    );
    await update(secondConfig, "outputDirectory", undefined);
    // The default belongs to the workspace root even with nested contentDirectory.
    await exportAndCheck(secondExam, "verifiche.export", [
      path.join(secondRoot, "output/sotto/settings/traccia-modello.pdf"),
    ]);
    const absoluteOutput = path.resolve(root, "../pdf-esterni");
    await update(secondConfig, "outputDirectory", absoluteOutput);
    await exportAndCheck(secondExam, "verifiche.export", [
      path.join(absoluteOutput, "sotto/settings/traccia-modello.pdf"),
    ]);

    const invalid = await createEmpty(
      path.join(root, "contenuti/verifiche/settings-invalidi.yaml"),
    );
    await update(firstConfig, "defaultFirstTraceId", "esempio");
    await vscode.commands.executeCommand("verifiche.template", invalid.uri);
    assert.equal(invalid.getText(), "");
    assert.equal(invalid.isDirty, false);
    await update(firstConfig, "defaultFirstTraceId", "B");
    await vscode.commands.executeCommand("verifiche.template", invalid.uri);
    assert.equal(exam(invalid.getText()).tracce[1].id, "B");
    assert.equal(exam(firstExam.getText()).tracce[1].id, "A");
    await update(firstConfig, "outputDirectory", "");
    await preview.show(firstExam, true);
    assert.equal(
      await vscode.commands.executeCommand("verifiche.export"),
      undefined,
    );
    assert.equal(
      await fs
        .stat(path.join(root, "output/sotto/settings/traccia-esempio.pdf"))
        .then(
          () => true,
          () => false,
        ),
      false,
    );
    assert.throws(
      () => settings(firstExam.uri).outputDirectory(root),
      /verifiche\.outputDirectory/,
    );
  } finally {
    for (let i = 0; i < changed.length; i++)
      await update(firstConfig, changed[i], previous[i]);
    await update(secondConfig, "outputDirectory", secondOutput);
  }
  console.log(
    "PASS: settings per folder, live changes, templates, invalid configuration, current/all PDF output, nested content directory and absolute destination",
  );
}
