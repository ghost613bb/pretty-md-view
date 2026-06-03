import * as vscode from 'vscode';
import { OPEN_PREVIEW_COMMAND } from './constants';

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(OPEN_PREVIEW_COMMAND, () => {
    vscode.window.showInformationMessage('Pretty Markdown Preview is ready.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {}
