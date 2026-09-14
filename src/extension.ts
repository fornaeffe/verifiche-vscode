import * as vscode from "vscode";
import { Preview } from "./preview";
import { Providers, Transfers } from "./providers";
import { registerCommands } from "./commands";
import { locate, clearRepositories } from "./host";

export function activate(context: vscode.ExtensionContext) {
  const preview = new Preview(context),
    providers = new Providers(context);
  providers.register();
  registerCommands(context, preview);
  context.subscriptions.push(preview, { dispose: clearRepositories });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const active = async (editor?: vscode.TextEditor) => {
    const loc = editor ? locate(editor.document.uri) : undefined;
    await vscode.commands.executeCommand(
      "setContext",
      "verifiche.document",
      !!loc,
    );
    await vscode.commands.executeCommand(
      "setContext",
      "verifiche.kind",
      loc?.kind ?? "",
    );
    if (editor && loc) {
      void providers.diagnose(editor.document);
      await preview.show(editor.document);
    }
  };
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((e) => void active(e)),
  );
  const refresh = () => {
    providers.fire();
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const d of new Set([
        ...vscode.window.visibleTextEditors.map((e) => e.document),
        ...(preview.document ? [preview.document] : []),
      ]))
        if (locate(d.uri) && !d.isClosed) void providers.diagnose(d);
      void preview.refresh();
    }, 300);
  };
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (locate(e.document.uri)) refresh();
    }),
    vscode.workspace.onDidCloseTextDocument((d) =>
      providers.diagnostics.delete(d.uri),
    ),
    { dispose: () => clearTimeout(timer) },
  );
  // Watch only content and style trees, not the entire source-code workspace.
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const directory = vscode.workspace
      .getConfiguration("verifiche", folder.uri)
      .get<string>("contentDirectory", "contenuti");
    for (const glob of [directory + "/**/*", "stili/**/*"]) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(folder, glob),
      );
      context.subscriptions.push(
        watcher,
        watcher.onDidChange(refresh),
        watcher.onDidCreate(refresh),
        watcher.onDidDelete(refresh),
      );
    }
  }
  void active(vscode.window.activeTextEditor);
  // Exposed only to Extension Host integration tests, not as user commands.
  return { preview, providers, transfers: new Transfers() };
}
