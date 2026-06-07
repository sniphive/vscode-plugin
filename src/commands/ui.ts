import * as vscode from 'vscode';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { NoteCacheService } from '../services/NoteCacheService';
import { showGistImportPanel } from '../views/webviews';
import { wrapCommand } from './CommandWrapper';

export function registerUICommands(
    context: vscode.ExtensionContext,
    snippetCache: SnippetCacheService,
    noteCache: NoteCacheService
): vscode.Disposable[] {
    const subscriptions: vscode.Disposable[] = [];

    subscriptions.push(vscode.commands.registerCommand('sniphive.refresh', wrapCommand(async () => {
        await Promise.all([snippetCache.refresh(), noteCache.refresh()]);
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.openSettings', wrapCommand(() => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'sniphive');
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.importGist', wrapCommand(() => {
        showGistImportPanel(context);
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.focus', wrapCommand(() => {
        vscode.commands.executeCommand('workbench.view.extension.sniphive');
    })));

    return subscriptions;
}
