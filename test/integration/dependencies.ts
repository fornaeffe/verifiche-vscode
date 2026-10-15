import * as vscode from "vscode";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import { structure } from "../../src/document";

export async function checkDependencies(api: any) {
  const root = process.env.VERIFICHE_TEST_ROOT!,
    secondRoot = process.env.VERIFICHE_TEST_SECOND_ROOT!,
    base = path.join(root, "contenuti"),
    secondBase = path.join(secondRoot, "archivio/contenuti"),
    file = path.join(base, "verifiche/dipendenze.yaml"),
    a = path.join(base, "esercizi/dipendenza-a.md"),
    b = path.join(base, "esercizi/dipendenza-b.md"),
    image = path.join(base, "allegati/dipendenza.svg"),
    css = path.join(root, "stili/predefinito.css"),
    svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12" fill="red"/></svg>',
    exercise = (text: string) =>
      `---\ntipo: A\n---\n:::variante base\n${text}\n:::\n`,
    exam = (id: string) =>
      `titolo: Dipendenze\ntracce: [{id: prova}]\nblocchi: [{esercizio: ${id}, versioni: {prova: base}}]\n`,
    pause = (ms = 1100) => new Promise((resolve) => setTimeout(resolve, ms)),
    waitFor = async (predicate: () => boolean) => {
      const deadline = Date.now() + 10000;
      while (!predicate() && Date.now() < deadline) await pause(50);
      assert.ok(predicate(), "Aggiornamento dipendenza non ricevuto");
      await pause();
    },
    replace = async (doc: vscode.TextDocument, text: string) => {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        doc.uri,
        new vscode.Range(
          doc.positionAt(0),
          doc.positionAt(doc.getText().length),
        ),
        text,
      );
      assert.ok(await vscode.workspace.applyEdit(edit));
    };
  await fs.writeFile(
    a,
    exercise("Iniziale.\n![Schema](/allegati/dipendenza.svg)"),
  );
  await fs.writeFile(b, exercise("Secondo esercizio."));
  await fs.writeFile(image, svg);
  await fs.writeFile(file, exam("dipendenza-a"));
  const secondFile = path.join(secondBase, "verifiche/dipendenze.yaml");
  await fs.writeFile(
    path.join(secondBase, "esercizi/dipendenza-a.md"),
    exercise("Altra radice."),
  );
  await fs.writeFile(secondFile, exam("dipendenza-a"));
  const aDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(a)),
    doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file)),
    secondDoc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(secondFile),
    );
  await vscode.window.showTextDocument(secondDoc, {
    viewColumn: vscode.ViewColumn.Three,
    preview: false,
  });
  await vscode.window.showTextDocument(doc, {
    viewColumn: vscode.ViewColumn.One,
    preview: false,
  });
  await api.preview.show(doc, true);
  await pause();
  const preview = api.preview,
    providers = api.providers,
    config = vscode.workspace.getConfiguration("verifiche", doc.uri),
    autoPreview = config.inspect("autoPreview")?.workspaceValue,
    originalRefresh = preview.refresh,
    originalDiagnose = providers.diagnose,
    diagnosed = new Map<string, number>();
  let refreshes = 0;
  preview.refresh = async function () {
    refreshes++;
    return originalRefresh.call(this);
  };
  providers.diagnose = async function (document: vscode.TextDocument) {
    const key = document.uri.toString();
    diagnosed.set(key, (diagnosed.get(key) ?? 0) + 1);
    return originalDiagnose.call(this, document);
  };
  const html = () => preview.panel.webview.html as string,
    count = (document = doc) => diagnosed.get(document.uri.toString()) ?? 0,
    unchanged = async (action: () => Promise<unknown>) => {
      const before = html(),
        refreshCount = refreshes,
        diagnoses = count();
      await action();
      await pause();
      assert.equal(html(), before);
      assert.equal(refreshes, refreshCount, "Refresh estraneo");
      assert.equal(count(), diagnoses, "Diagnostica estranea");
    },
    updated = async (
      action: () => Promise<unknown>,
      pattern: RegExp,
      diagnostic = true,
    ) => {
      const before = refreshes,
        diagnoses = count(),
        other = count(secondDoc);
      await action();
      await waitFor(() => refreshes > before && pattern.test(html()));
      assert.equal(count() > diagnoses, diagnostic);
      assert.equal(count(secondDoc), other, "Diagnostica nell'altra radice");
    };
  try {
    // Hidden buffers and filesystem events must both be filtered.
    await unchanged(() =>
      fs.writeFile(
        path.join(base, "esercizi/estraneo.md"),
        "---\ninvalido: [\n",
      ),
    );
    await unchanged(() =>
      fs.writeFile(path.join(base, "allegati/estraneo.svg"), svg),
    );
    await unchanged(() =>
      fs.writeFile(
        path.join(secondBase, "esercizi/dipendenza-a.md"),
        exercise("Altra radice cambiata."),
      ),
    );
    const unrelated = await vscode.workspace.openTextDocument(
      vscode.Uri.file(b),
    );
    await unchanged(() => replace(unrelated, exercise("Buffer estraneo.")));

    await updated(
      () =>
        replace(
          aDoc,
          exercise("Buffer attivo.\n![Schema](/allegati/dipendenza.svg)"),
        ),
      /Buffer attivo/,
    );
    assert.ok(aDoc.isDirty);
    await updated(
      () => fs.writeFile(image, svg.replace("red", "blue")),
      /data:image\/svg\+xml;base64/,
    );
    assert.ok(
      html().includes(
        Buffer.from(svg.replace("red", "blue")).toString("base64"),
      ),
    );
    await fs.mkdir(path.dirname(css), { recursive: true });
    await updated(
      () => fs.writeFile(css, "body{color:rgb(1,2,3)}"),
      /rgb\(1,2,3\)/,
      false,
    );
    await updated(() => fs.unlink(css), /Esporta PDF/, false);
    assert.doesNotMatch(html(), /rgb\(1,2,3\)/);
    await updated(() => fs.unlink(image), /Allegato mancante/);
    await updated(() => fs.writeFile(image, svg), /Buffer attivo/);
    assert.equal(providers.diagnostics.get(doc.uri)?.length, 0);

    // Removed references must stop causing work, including their old images.
    await updated(() => replace(doc, exam("dipendenza-b")), /Buffer estraneo/);
    await unchanged(() => replace(aDoc, exercise("Non più referenziato.")));
    await unchanged(() => fs.writeFile(image, svg.replace("red", "green")));
    await updated(
      () => replace(unrelated, exercise("Nuova dipendenza.")),
      /Nuova dipendenza/,
    );

    // Track an absent file before a failed read, then recover on create/delete.
    const missing = path.join(base, "esercizi/dipendenza-mancante.md");
    await updated(
      () => replace(doc, exam("dipendenza-mancante")),
      /Anteprima non disponibile/,
    );
    assert.ok(providers.diagnostics.get(doc.uri)?.length);
    await updated(
      () => fs.writeFile(missing, exercise("File ripristinato.")),
      /File ripristinato/,
    );
    assert.equal(providers.diagnostics.get(doc.uri)?.length, 0);
    await updated(() => fs.unlink(missing), /Anteprima non disponibile/);
    await updated(
      () => fs.writeFile(missing, exercise("Creato ancora.")),
      /Creato ancora/,
    );

    // Picker cards have their own exercise/resource dependencies.
    await replace(doc, exam("dipendenza-b"));
    await pause();
    const ref = structure(doc.getText()).references[0];
    await preview.choose(doc, ref.node.range![0], "prova");
    await pause();
    await updated(
      () =>
        replace(
          unrelated,
          exercise("Scheda aggiornata.\n![Schema](/allegati/dipendenza.svg)"),
        ),
      /Scheda aggiornata/,
    );
    assert.match(html(), /data-variant/);
    await updated(
      () => fs.writeFile(image, svg.replace("red", "blue")),
      /Scheda aggiornata/,
    );
    await unchanged(() => replace(aDoc, exercise("Estraneo al selettore.")));

    // Returning focus from the picker can auto-open the preview. Disable that
    // independent behavior while checking disposal of the dependency set.
    await config.update(
      "autoPreview",
      false,
      vscode.ConfigurationTarget.Workspace,
    );
    preview.dispose();
    await pause();
    assert.equal(preview.panel, undefined);
    const before = refreshes;
    await fs.writeFile(image, svg);
    await pause();
    assert.equal(refreshes, before, "Anteprima chiusa ancora aggiornata");
  } finally {
    preview.refresh = originalRefresh;
    providers.diagnose = originalDiagnose;
    await config.update(
      "autoPreview",
      autoPreview,
      vscode.ConfigurationTarget.Workspace,
    );
  }
  console.log(
    "PASS: dependency-scoped preview/diagnostics, unsaved buffers, unrelated changes, multiple roots, images/styles, missing file recovery, replaced references, picker and closed preview",
  );
}
