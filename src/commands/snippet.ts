import * as vscode from 'vscode';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { E2EEService } from '../crypto/E2EEService';
import { showCreateSnippetPanel } from '../views/webviews';
import { getSupportedLanguagesAsync, mapVscodeLanguage } from '../utils/languages';
import { isEncrypted } from '../models/Snippet';
import { wrapCommand } from './CommandWrapper';

export function registerSnippetCommands(context: vscode.ExtensionContext, snippetCache: SnippetCacheService, e2ee: E2EEService): vscode.Disposable[] {
    const subscriptions: vscode.Disposable[] = [];

    subscriptions.push(vscode.commands.registerCommand('sniphive.createSnippet', wrapCommand(async () => {
        const editor = vscode.window.activeTextEditor;
        let content = '';
        let language = '';
        if (editor && !editor.selection.isEmpty) {
            content = editor.document.getText(editor.selection);
            const langId = editor.document.languageId;
            const supported = await getSupportedLanguagesAsync();
            const mapped = mapVscodeLanguage(langId);
            if (mapped && supported.includes(mapped)) language = mapped;
        }
        await showCreateSnippetPanel(context, { content, language });
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.insertSnippet', wrapCommand(async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { vscode.window.showWarningMessage('No active editor'); return; }
        const snippets = snippetCache.getActive();
        const items = await Promise.all(snippets.map(async (s) => {
            let preview = s.content;
            if (isEncrypted(s) && e2ee.isUnlocked()) {
                const decrypted = await e2ee.decryptContent(s.content, s.encrypted_dek!, '', '');
                if (decrypted) preview = decrypted;
            }
            return {
                label: s.title,
                description: `${s.language || 'text'} · \${preview.substring(0, 60)}`,
                detail: preview.substring(0, 200),
                snippet: s,
            };
        }));
        const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Search snippets...', matchOnDescription: true, matchOnDetail: true });
        if (pick) {
            let content = pick.snippet.content;
            if (isEncrypted(pick.snippet) && e2ee.isUnlocked()) {
                const decrypted = await e2ee.decryptContent(pick.snippet.content, pick.snippet.encrypted_dek!, '', '');
                if (decrypted) content = decrypted;
                else { vscode.window.showErrorMessage('Failed to decrypt snippet'); return; }
            }
            editor.edit(eb => eb.insert(editor.selection.start, content));
        }
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.showRecent', wrapCommand(async () => {
        const snippets = snippetCache.getActive().slice(0, 20);
        const items = await Promise.all(snippets.map(async (s) => {
            let preview = s.content;
            if (isEncrypted(s)) {
                if (e2ee.isUnlocked()) {
                    const decrypted = await e2ee.decryptContent(s.content, s.encrypted_dek!, '', '');
                    if (decrypted) preview = decrypted;
                    else preview = 'Error decrypting content';
                } else {
                    preview = '🔒 Encrypted content';
                }
            }
            return {
                label: s.title,
                description: s.language || '',
                detail: preview.substring(0, 100),
                snippet: s,
            };
        }));
        const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Recent snippets...' });
        if (pick && vscode.window.activeTextEditor) {
            let content = pick.snippet.content;
            if (isEncrypted(pick.snippet)) {
                if (!e2ee.isUnlocked()) {
                    vscode.window.showErrorMessage('Please unlock SnipHive first to insert encrypted snippets');
                    return;
                }
                const decrypted = await e2ee.decryptContent(pick.snippet.content, pick.snippet.encrypted_dek!, '', '');
                if (decrypted) content = decrypted;
                else { vscode.window.showErrorMessage('Failed to decrypt snippet'); return; }
            }
            vscode.window.activeTextEditor.edit(eb => eb.insert(vscode.window.activeTextEditor!.selection.start, content));
        }
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.openSnippetDetail', wrapCommand(async (snippet: any) => {
        const { openSnippetDetail } = await import('../views/panels');
        openSnippetDetail(context, snippet);
    })));

    return subscriptions;
}
