import * as vscode from "vscode";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

export async function checkStyleDocuments(preview: any, extensionPath: string) {
  const root = process.env.VERIFICHE_TEST_SECOND_ROOT!;
  const base = path.join(root, "archivio/contenuti");
  const output = process.env.VERIFICHE_TEST_RESULTS!;
  const cssFile = path.join(root, "stili/predefinito.css");
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(path.dirname(cssFile), { recursive: true });
  const previous = await fs.readFile(cssFile).catch(() => undefined);
  const wrongFile = path.join(root, "archivio/stili/predefinito.css");
  await fs.mkdir(path.dirname(wrongFile), { recursive: true });
  await fs.writeFile(wrongFile, 'body::after { content: "STILE-ERRATO"; }');
  const css = await fs.readFile(
    path.join(extensionPath, "media/predefinito.css"),
    "utf8",
  );
  const long =
    "Un testo sufficientemente lungo per occupare più righe e verificare che lo spazio delle risposte sia sempre riservato senza sovrapposizioni. ".repeat(
      3,
    );
  const samples = [
    [
      "A",
      "Osserva lo schema e calcola $2^3$.\n\n![Schema](/allegati/schema.svg)",
    ],
    [
      "SM",
      "Scegli la risposta corretta.\n\n- Prima opzione.\n- Seconda opzione.",
    ],
    ["VF", "Indica vero o falso.\n\n- " + long + "\n- Seconda affermazione."],
    [
      "Etichettare",
      "Scrivi le etichette.\n\n- " + long + "\n- Seconda etichetta.",
    ],
    ["Completamento", "Completa: una mole contiene __________ particelle."],
  ] as const;
  try {
    // The parent-of-content stylesheet is a deliberate decoy for the PDF regression.
    await fs.writeFile(
      cssFile,
      css + '\nbody::after { content: "STILE-RADICE"; }\n',
    );
    for (const [type, text] of samples)
      await fs.writeFile(
        path.join(base, `esercizi/stile-${type}.md`),
        `---\ntipo: ${type}\n---\n:::variante base\n${text}\n:::\n`,
      );
    const file = path.join(base, "verifiche/stili.yaml");
    const blocks = samples.map(
      ([type]) =>
        `  - esercizio: stile-${type}\n    punti: 1\n    versioni: {prova: base}`,
    );
    blocks.splice(2, 0, "  - salto_pagina: true");
    await fs.writeFile(
      file,
      `titolo: Prova sintetica degli stili\ntracce: [{id: prova, pubblica: true}]\nblocchi:\n  - istruzioni: Rispondi a tutte le domande.\n${blocks.join("\n")}\n`,
    );
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    await preview.show(doc, true);
    assert.match(preview.panel.webview.html, /STILE-RADICE/);
    assert.doesNotMatch(preview.panel.webview.html, /STILE-ERRATO/);
    await fs.writeFile(
      path.join(output, "style-preview.html"),
      preview.panel.webview.html,
    );
    const files = await vscode.commands.executeCommand<string[]>(
      "verifiche.exportAll",
    );
    assert.equal(files?.length, 1);
    await fs.copyFile(files![0], path.join(output, "style-nested.pdf"));
    // Check every template also in the exercise-preview wrapper (no .esercizio section).
    for (const [type] of samples) {
      await preview.show(
        await vscode.workspace.openTextDocument(
          vscode.Uri.file(path.join(base, `esercizi/stile-${type}.md`)),
        ),
        true,
      );
      await fs.writeFile(
        path.join(output, `style-exercise-${type}.html`),
        preview.panel.webview.html,
      );
    }
  } finally {
    if (previous) await fs.writeFile(cssFile, previous);
    else await fs.unlink(cssFile);
  }
  console.log(
    "PASS: all five exercise types, image/math, points, page break, custom CSS from workspace root with nested contents; preview/PDF artifacts saved",
  );
}
