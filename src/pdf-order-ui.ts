import * as vscode from "vscode";
import {
  hasRandomGroups,
  newSeed,
  normalizeSeed,
  PDFOrder,
} from "./random-order";

export interface PDFOrderUI {
  mode(): Promise<"original" | "random" | "seed" | undefined>;
  seed(): Promise<string | undefined>;
}

const ui: PDFOrderUI = {
  async mode() {
    return (
      await vscode.window.showQuickPick(
        [
          { label: "Mantieni l’ordine del YAML", value: "original" as const },
          {
            label: "Riordina casualmente i gruppi abilitati",
            value: "random" as const,
          },
          {
            label: "Ripeti un riordino usando un seme…",
            value: "seed" as const,
          },
        ],
        {
          title: "Ordine dei gruppi nel PDF",
          placeHolder:
            "L’anteprima segue il YAML; il riordino riguarda solo i PDF esportati.",
        },
      )
    )?.value;
  },
  async seed() {
    return vscode.window.showInputBox({
      title: "Seme del riordino casuale",
      prompt:
        "Inserisci i 16 caratteri esadecimali riportati nel nome del PDF precedente.",
      validateInput: (value) => {
        try {
          normalizeSeed(value);
          return undefined;
        } catch (e) {
          return (e as Error).message;
        }
      },
    });
  },
};

export async function choosePDFOrder(
  exam: any,
  dialogs: PDFOrderUI = ui,
): Promise<PDFOrder | undefined> {
  if (!hasRandomGroups(exam.blocchi)) return {};
  const mode = await dialogs.mode();
  if (mode === undefined) return;
  if (mode === "original") return {};
  if (mode === "random") return { seed: newSeed() };
  const seed = await dialogs.seed();
  if (seed === undefined) return;
  return { seed: normalizeSeed(seed) };
}
