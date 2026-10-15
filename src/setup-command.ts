import * as vscode from "vscode";
import path from "node:path";
import { createDataFolder, directoryName, initializeGit } from "./setup";

// Dialogs are injectable so cancellation and failures can be verified without a GUI driver.
export interface SetupUI {
  mode(): Promise<"new" | "empty" | undefined>;
  folder(mode: "new" | "empty"): Promise<vscode.Uri | undefined>;
  name(): Promise<string | undefined>;
  git(): Promise<boolean | undefined>;
  warn(message: string): Promise<void>;
  open(root: vscode.Uri): Promise<void>;
}
const ui: SetupUI = {
  async mode() {
    return (
      await vscode.window.showQuickPick(
        [
          {
            label: "Nuova cartella",
            description: "Scegli la cartella genitore e il nome",
            value: "new" as const,
          },
          {
            label: "Cartella vuota esistente",
            description: "Inizializza una cartella già creata",
            value: "empty" as const,
          },
        ],
        { title: "Crea cartella dati" },
      )
    )?.value;
  },
  async folder(mode) {
    return (
      await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title:
          mode === "new"
            ? "Cartella genitore dei nuovi dati"
            : "Cartella dati vuota",
        openLabel: "Scegli cartella",
      })
    )?.[0];
  },
  async name() {
    return vscode.window.showInputBox({
      title: "Nome della nuova cartella dati",
      value: "dati-verifiche",
      validateInput: (value) => {
        try {
          directoryName(value);
          return undefined;
        } catch (e) {
          return (e as Error).message;
        }
      },
    });
  },
  async git() {
    return (
      await vscode.window.showQuickPick(
        [
          {
            label: "Solo cartella dati",
            description: "Git non è richiesto",
            value: false,
          },
          {
            label: "Inizializza anche Git",
            description: "Repository locale, senza commit né pubblicazione",
            value: true,
          },
        ],
        { title: "Versionamento della nuova cartella" },
      )
    )?.value;
  },
  async warn(message) {
    await vscode.window.showWarningMessage(message);
  },
  async open(root) {
    await vscode.commands.executeCommand("vscode.openFolder", root, {
      forceNewWindow: true,
    });
  },
};

export async function runSetup(
  assetPath: string,
  dialogs: SetupUI = ui,
  gitInit = initializeGit,
) {
  const mode = await dialogs.mode();
  if (!mode) return;
  const selected = await dialogs.folder(mode);
  if (!selected) return;
  if (selected.scheme !== "file") throw Error("Scegliere una cartella locale.");
  let root = selected.fsPath;
  if (mode === "new") {
    const name = await dialogs.name();
    if (name === undefined) return;
    root = path.join(root, directoryName(name));
  }
  const git = await dialogs.git();
  if (git === undefined) return;
  const configured = vscode.workspace
    .getConfiguration("verifiche", vscode.Uri.file(root))
    .get("contentDirectory", "contenuti");
  const result = await createDataFolder(root, assetPath, configured);
  if (git) {
    try {
      await gitInit(result.root);
    } catch (e) {
      await dialogs.warn(
        `Cartella dati creata in ${result.root}, ma Git non è stato inizializzato correttamente: ${e instanceof Error ? e.message : e}. La cartella è utilizzabile; verificare l'eventuale cartella .git prima di riprovare.`,
      );
    }
  }
  try {
    await dialogs.open(vscode.Uri.file(result.root));
  } catch (e) {
    throw Error(
      `Cartella dati creata in ${result.root}, ma apertura in VS Code non riuscita: ${e instanceof Error ? e.message : e}. Aprirla con File: Apri cartella.`,
      { cause: e },
    );
  }
  return result;
}
