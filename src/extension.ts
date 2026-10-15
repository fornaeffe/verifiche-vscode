import * as vscode from "vscode";
import { Preview } from "./preview";
import { Providers, Transfers } from "./providers";
import { registerCommands } from "./commands";
import { locate, clearRepositories } from "./host";
import { runSetup, SetupUI } from "./setup-command";

export function activate(context: vscode.ExtensionContext) {
  const preview = new Preview(context),
    providers = new Providers(context);
  providers.register();
  const commands = registerCommands(context, preview);
  context.subscriptions.push(preview, { dispose: clearRepositories });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const documents = () =>
    [
      ...new Set([
        ...vscode.window.visibleTextEditors.map((e) => e.document),
        ...(preview.panel && preview.document ? [preview.document] : []),
      ]),
    ].filter((doc) => !doc.isClosed && locate(doc.uri));
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
    providers.retain(documents());
  };
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((e) => void active(e)),
  );
  const changed = new Map<
    string,
    { uri: vscode.Uri; previewRevision: number }
  >();
  const refresh = (uri: vscode.Uri) => {
    const docs = documents();
    if (
      !preview.dependsOn(uri) &&
      !docs.some((doc) => providers.dependsOn(doc, uri))
    )
      return;
    changed.set(uri.toString(), { uri, previewRevision: preview.revision });
    clearTimeout(timer);
    timer = setTimeout(() => {
      const changes = [...changed.values()];
      changed.clear();
      const current = documents();
      providers.retain(current);
      for (const doc of current)
        if (changes.some(({ uri }) => providers.dependsOn(doc, uri)))
          void providers.diagnose(doc);
      // A preview opened/refreshed after the event already includes that change.
      if (
        changes.some(
          ({ uri, previewRevision }) =>
            previewRevision === preview.revision && preview.dependsOn(uri),
        )
      )
        void preview.refresh();
    }, 300);
  };
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (!e.contentChanges.length) return;
      if (documents().includes(e.document)) providers.fire();
      refresh(e.document.uri);
    }),
    vscode.workspace.onDidCloseTextDocument((d) => {
      providers.close(d);
      refresh(d.uri);
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => {
      const current = documents();
      providers.retain(current);
      for (const doc of current) void providers.diagnose(doc);
    }),
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
  return {
    preview,
    providers,
    transfers: new Transfers(),
    pdf: commands.pdf,
    setup: (dialogs: SetupUI, gitInit?: (root: string) => Promise<void>) =>
      runSetup(
        context.asAbsolutePath("media/predefinito.css"),
        dialogs,
        gitInit,
      ),
  };
}
