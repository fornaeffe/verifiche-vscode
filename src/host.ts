import * as vscode from "vscode";
import path from "node:path";
import fs from "node:fs";
import { Repository, relativeId } from "./repository";
import { Patch } from "./document";

export interface Location {
  root: string;
  base: string;
  kind: "esercizi" | "verifiche";
  id: string;
}
export function locate(uri: vscode.Uri): Location | undefined {
  if (uri.scheme !== "file") return;
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const root = folder.uri.fsPath;
    const base = path.resolve(
      root,
      vscode.workspace
        .getConfiguration("verifiche", folder.uri)
        .get<string>("contentDirectory", "contenuti"),
    );
    for (const kind of ["esercizi", "verifiche"] as const) {
      const relative = path.relative(path.join(base, kind), uri.fsPath);
      if (
        relative &&
        !relative.startsWith("..") &&
        !path.isAbsolute(relative) &&
        (kind === "esercizi" ? /\.md$/i : /\.ya?ml$/i).test(relative)
      )
        return {
          root,
          base,
          kind,
          id: relativeId(path.join(base, kind), uri.fsPath),
        };
    }
  }
}
export const readDocument = async (file: string) => {
  const uri = vscode.Uri.file(file),
    open = vscode.workspace.textDocuments.find(
      (d) => d.uri.toString() === uri.toString(),
    );
  return open
    ? open.getText()
    : Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
};
const repositories = new Map<string, Repository>();
export function repository(base: string) {
  let r = repositories.get(base);
  if (!r) {
    r = new Repository(base, readDocument, () => {
      const buffers = new Map(
        vscode.workspace.textDocuments
          .filter((d) => !d.isClosed)
          .map((d) => [d.uri.toString(), d.getText()]),
      );
      return async (file) =>
        buffers.get(vscode.Uri.file(file).toString()) ??
        Buffer.from(
          await vscode.workspace.fs.readFile(vscode.Uri.file(file)),
        ).toString("utf8");
    });
    repositories.set(base, r);
  }
  return r;
}
export function clearRepositories() {
  for (const r of repositories.values()) r.clear();
  repositories.clear();
}
export function addPatches(
  edit: vscode.WorkspaceEdit,
  doc: vscode.TextDocument,
  patches: Patch[],
) {
  for (const p of patches)
    edit.replace(
      doc.uri,
      new vscode.Range(doc.positionAt(p.start), doc.positionAt(p.end)),
      p.text,
    );
}
export async function apply(
  doc: vscode.TextDocument,
  version: number,
  patches: Patch[],
  extra?: vscode.WorkspaceEdit,
) {
  if (doc.version !== version)
    throw Error("Il documento è cambiato: ripetere il comando.");
  const edit = extra ?? new vscode.WorkspaceEdit();
  addPatches(edit, doc, patches);
  if (!(await vscode.workspace.applyEdit(edit)))
    throw Error("Modifica non applicata");
}
export async function target(uri?: vscode.Uri) {
  const doc = uri
    ? await vscode.workspace.openTextDocument(uri)
    : vscode.window.activeTextEditor?.document;
  if (!doc || !locate(doc.uri))
    throw Error("Aprire un file nelle cartelle esercizi o verifiche.");
  return doc;
}
export function offset(doc: vscode.TextDocument, given?: number) {
  return (
    given ??
    (vscode.window.activeTextEditor?.document === doc
      ? doc.offsetAt(vscode.window.activeTextEditor.selection.active)
      : 0)
  );
}
export const errorMessage = (e: unknown) =>
  String(e instanceof Error ? e.message : e);
