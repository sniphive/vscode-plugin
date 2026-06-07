import * as vscode from 'vscode';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { NoteCacheService } from '../services/NoteCacheService';
import { showGistImportPanel } from '../views/webviews';
import { wrapCommand } from './CommandWrapper';
import { E2EEService } from '../crypto/E2EEService';
import { SnipHiveTreeItem } from '../providers/SnipHiveTreeItem';

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

    subscriptions.push(vscode.commands.registerCommand('sniphive.copyPublicLink', wrapCommand(async (item: SnipHiveTreeItem) => {
        if (!item) return;
        const isSnippet = item.itemType === 'snippet';
        let publicUrl: string | null = null;
        let encryptedDek: string | null | undefined = null;
        let slug = item.slug;

        if (isSnippet) {
            const s = snippetCache.getActive().find(x => x.id === item.itemId);
            if (s) { publicUrl = s.public_url; encryptedDek = s.encrypted_dek; }
        } else {
            const n = noteCache.getActive().find(x => x.id === item.itemId);
            if (n) { publicUrl = n.public_url; encryptedDek = n.encrypted_dek; }
        }

        let url = publicUrl || `https://sniphive.net/p/${isSnippet ? 's' : 'n'}/${slug}`;
        if (encryptedDek) {
            const dek = await E2EEService.getInstance().decryptDEK(encryptedDek);
            if (dek) {
                url += `#${dek}`;
            }
        }
        await vscode.env.clipboard.writeText(url);
        vscode.window.showInformationMessage('Public link copied to clipboard');
    })));

    return subscriptions;
}
