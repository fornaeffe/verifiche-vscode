import * as vscode from "vscode";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { PDFOrderUI } from "../../src/pdf-order-ui";
import { hash } from "../../src/core";

export async function checkRandomOrder(api: any) {
  const root = vscode.Uri.file(process.env.VERIFICHE_TEST_ROOT!).fsPath;
  const base = path.join(root, "contenuti");
  const file = path.join(base, "verifiche/riordino.yaml");
  const output = path.join(root, "output/riordino");
  const seed = "7f3a9c2d84b610ef";
  const block = (id: string) => ({
    esercizio: { id: `casuale-${id}`, punti: 1, versioni: { default: "base" } },
  });
  for (const id of ["a", "b", "c", "d", "e", "f", "omesso"])
    await fs.writeFile(
      path.join(base, `esercizi/casuale-${id}.md`),
      `---\ntipo: A\n---\n:::variante base\nDomanda-${id.toUpperCase()}.\n:::\n`,
    );
  // The saved document has no random group: export must use the unsaved buffer.
  await fs.writeFile(
    file,
    YAML.stringify({
      titolo: "Bozza salvata",
      tracce: [{ id: "prova" }],
      blocchi: [],
    }),
  );
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
  const source = YAML.stringify({
    titolo: "Riordino sintetico",
    tracce: [{ id: "prova", pubblica: true }, { id: "1" }],
    blocchi: [
      {
        gruppo: {
          ordine_casuale: true,
          istruzioni: "Gruppo esterno",
          punti: 2,
          esercizi: [
            block("a"),
            {
              gruppo: {
                istruzioni: "Sottogruppo fisso",
                esercizi: [block("b"), block("c")],
              },
            },
            {
              gruppo: {
                ordine_casuale: true,
                istruzioni: "Sottogruppo casuale",
                esercizi: [block("d"), block("e"), block("f")],
              },
            },
            {
              esercizio: {
                id: "casuale-omesso",
                punti: 8,
                versioni: { default: "" },
              },
            },
          ],
        },
      },
    ],
  });
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    doc.uri,
    new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)),
    source,
  );
  assert.ok(await vscode.workspace.applyEdit(edit));
  await api.preview.show(doc, true);
  const previewContent = () =>
    [...api.preview.panel.webview.html.matchAll(/srcdoc="([^"]*)"/g)].map(
      (m: RegExpMatchArray) => hash(m[1]),
    );
  const originalPreview = previewContent();
  const dialogs = (
    mode: "original" | "random" | "seed" | undefined,
    value: string | undefined = seed,
  ): PDFOrderUI => ({
    async mode() {
      return mode;
    },
    async seed() {
      return value;
    },
  });
  assert.equal(await api.pdf(true, dialogs(undefined)), undefined);
  assert.equal(
    await api.pdf(true, {
      ...dialogs("seed"),
      async seed() {
        return undefined;
      },
    }),
    undefined,
  );
  await assert.rejects(fs.access(output));
  await assert.rejects(
    api.pdf(true, dialogs("seed", "../non-valido")),
    /16 caratteri/,
  );
  await assert.rejects(fs.access(output));

  const files: string[] = await api.pdf(
    true,
    dialogs("seed", seed.toUpperCase()),
  );
  assert.deepEqual(
    files,
    ["prova", "1"].map((id) =>
      path.join(output, `traccia-${id}.seme-${seed}.pdf`),
    ),
  );
  for (const pdf of files)
    assert.equal((await fs.readFile(pdf)).subarray(0, 5).toString(), "%PDF-");
  // Same seed replaces the existing file; it must not add counters or timestamps.
  await fs.writeFile(files[0], "da sovrascrivere");
  assert.deepEqual(await api.pdf(false, dialogs("seed")), [files[0]]);
  assert.equal(
    (await fs.readFile(files[0])).subarray(0, 5).toString(),
    "%PDF-",
  );
  const random: string[] = await api.pdf(false, dialogs("random"));
  assert.match(
    path.basename(random[0]),
    /^traccia-prova\.seme-[0-9a-f]{16}\.pdf$/,
  );
  assert.notEqual(random[0], files[0]);
  const originals: string[] = await api.pdf(true, dialogs("original"));
  assert.deepEqual(
    originals,
    ["prova", "1"].map((id) => path.join(output, `traccia-${id}.pdf`)),
  );
  assert.equal((await fs.readdir(output)).length, 5);
  assert.equal(doc.getText(), source);
  assert.ok(doc.isDirty);
  assert.deepEqual(
    api.preview.snapshot.exam.blocchi[0].gruppo.esercizi.map(
      (b: any) => b.esercizio?.id ?? b.gruppo.istruzioni,
    ),
    ["casuale-a", "Sottogruppo fisso", "Sottogruppo casuale", "casuale-omesso"],
  );
  // No explicit refresh: exporting must not replace the preview with a shuffled tree.
  assert.deepEqual(previewContent(), originalPreview);

  const results = process.env.VERIFICHE_TEST_RESULTS!;
  for (const pdf of [...files, ...originals])
    await fs.copyFile(pdf, path.join(results, path.basename(pdf)));
  if (process.env.VERIFICHE_UI_TEST) {
    await fs.writeFile(
      path.join(process.env.VERIFICHE_UI_TEST, "ui-ready-random-cancel"),
      "ready",
    );
    assert.equal(
      await vscode.commands.executeCommand("verifiche.exportAll"),
      undefined,
    );
    await fs.writeFile(
      path.join(process.env.VERIFICHE_UI_TEST, "ui-ready-random-seed"),
      "ready",
    );
    assert.deepEqual(
      await vscode.commands.executeCommand("verifiche.exportAll"),
      files,
    );
  }
  console.log(
    "PASS: random group export, nested groups, unsaved buffer, cancellation, seed validation, original/automatic/reused seed filenames, overwrite, preview unchanged and real PDF files",
  );
}
