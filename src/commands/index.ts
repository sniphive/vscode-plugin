import * as vscode from 'vscode';
import { SnipHiveAuthService } from '../services/SnipHiveAuthService';
import { SnipHiveApiService } from '../services/SnipHiveApiService';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { NoteCacheService } from '../services/NoteCacheService';
import { E2EEService } from '../crypto/E2EEService';
import { SidebarManager } from '../views/SidebarManager';
import { StatusBarManager } from '../status/StatusBarManager';
import { showLoginPanel, showUnlockPanel, showCreateSnippetPanel, showE2EESetupPanel, showGistImportPanel } from '../views/webviews';
import { getSupportedLanguages } from '../config/settings';
import { isEncrypted } from '../models/Snippet';
import { outputChannel } from '../extension';

export function registerCommands(
    context: vscode.ExtensionContext,
    auth: SnipHiveAuthService,
    api: SnipHiveApiService,
    snippetCache: SnippetCacheService,
    noteCache: NoteCacheService,
    e2ee: E2EEService,
    sidebar: SidebarManager,
    statusBar: StatusBarManager,
) {
    const subscriptions: vscode.Disposable[] = [];

    // createSnippet
    subscriptions.push(vscode.commands.registerCommand('sniphive.createSnippet', async () => {
        const editor = vscode.window.activeTextEditor;
        let content = '';
        let language = '';
        if (editor && !editor.selection.isEmpty) {
            content = editor.document.getText(editor.selection);
            const langId = editor.document.languageId;
            const supported = getSupportedLanguages();
            const mapped = mapVscodeLanguage(langId);
            if (mapped && supported.includes(mapped)) language = mapped;
        }
        showCreateSnippetPanel(context, { content, language });
    }));

    // insertSnippet
    subscriptions.push(vscode.commands.registerCommand('sniphive.insertSnippet', async () => {
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
                description: `${s.language || 'text'} · ${preview.substring(0, 60)}`,
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
    }));

    // refresh
    subscriptions.push(vscode.commands.registerCommand('sniphive.refresh', async () => {
        await Promise.all([snippetCache.refresh(), noteCache.refresh()]);
    }));

    // openSettings
    subscriptions.push(vscode.commands.registerCommand('sniphive.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'sniphive');
    }));

    // setupE2EE
    subscriptions.push(vscode.commands.registerCommand('sniphive.setupE2EE', () => {
        showE2EESetupPanel(context);
    }));

    // importGist
    subscriptions.push(vscode.commands.registerCommand('sniphive.importGist', () => {
        showGistImportPanel(context);
    }));

    // manageTags
    subscriptions.push(vscode.commands.registerCommand('sniphive.manageTags', async () => {
        const tags = await api.getTags();
        const items = tags.map(t => ({
            label: t.name,
            description: `#${t.color} · ${t.snippets_count} snippets · ${t.notes_count} notes`,
            tag: t,
        }));
        const pick = await vscode.window.showQuickPick(
            [...items, { label: '$(add) Create New Tag', description: '', tag: null }],
            { placeHolder: 'Select tag to edit or create new' }
        );
        if (!pick) return;
        if (pick.tag === null) {
            const name = await vscode.window.showInputBox({ prompt: 'Tag name' });
            if (!name) return;
            const color = await vscode.window.showInputBox({ prompt: 'Color (hex)', value: '#FF5733' });
            if (!color) return;
            await api.createTag(name, color);
            vscode.window.showInformationMessage(`Tag "${name}" created.`);
        } else {
            const action = await vscode.window.showQuickPick(['Edit', 'Delete'], { placeHolder: `Action for "${pick.tag.name}"` });
            if (action === 'Delete') {
                const yes = await vscode.window.showWarningMessage(`Delete tag "${pick.tag.name}"?`, { modal: true }, 'Delete');
                if (yes) {
                    await api.deleteTag(pick.tag.id);
                    vscode.window.showInformationMessage('Tag deleted.');
                }
            } else if (action === 'Edit') {
                const name = await vscode.window.showInputBox({ prompt: 'New name', value: pick.tag.name });
                if (!name) return;
                const color = await vscode.window.showInputBox({ prompt: 'New color (hex)', value: pick.tag.color });
                if (!color) return;
                await api.updateTag(pick.tag.id, name, color);
                vscode.window.showInformationMessage('Tag updated.');
            }
        }
    }));

    // showRecent
    subscriptions.push(vscode.commands.registerCommand('sniphive.showRecent', async () => {
        const snippets = snippetCache.getActive().slice(0, 20);
        const items = snippets.map(s => ({
            label: s.title,
            description: s.language || '',
            detail: s.content.substring(0, 100),
            snippet: s,
        }));
        const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Recent snippets...' });
        if (pick && vscode.window.activeTextEditor) {
            vscode.window.activeTextEditor.edit(eb => eb.insert(vscode.window.activeTextEditor!.selection.start, pick.snippet.content));
        }
    }));

    // logout
    subscriptions.push(vscode.commands.registerCommand('sniphive.logout', async () => {
        await auth.logout();
        snippetCache.clear();
        noteCache.clear();
        e2ee.clearPrivateKey();
        statusBar.setState('logged-out');
        const { updateContexts } = await import('../extension');
        updateContexts(false, false);
    }));

    // showLogin
    subscriptions.push(vscode.commands.registerCommand('sniphive.showLogin', () => {
        showLoginPanel(context);
    }));

    // showUnlock
    subscriptions.push(vscode.commands.registerCommand('sniphive.showUnlock', () => {
        showUnlockPanel(context);
    }));

    // afterLogin
    subscriptions.push(vscode.commands.registerCommand('sniphive.afterLogin', async () => {
        const { updateContexts } = await import('../extension');
        const secStatus = await api.getSecurityStatus();
        if (secStatus?.setup_complete) {
            statusBar.setState('authenticated-locked');
            updateContexts(true, false);
        } else {
            statusBar.setState('authenticated-unlocked');
            updateContexts(true, true);
            await sidebar.loadAllData();
        }
    }));

    // afterUnlock
    subscriptions.push(vscode.commands.registerCommand('sniphive.afterUnlock', async () => {
        statusBar.setState('ready', auth.getUserEmail());
        const { updateContexts } = await import('../extension');
        updateContexts(true, true);
        await sidebar.loadAllData();
    }));

    // focus
    subscriptions.push(vscode.commands.registerCommand('sniphive.focus', () => {
        vscode.commands.executeCommand('workbench.view.extension.sniphive');
    }));

    // openSnippetDetail
    subscriptions.push(vscode.commands.registerCommand('sniphive.openSnippetDetail', async (snippet: any) => {
        const { openSnippetDetail } = await import('../views/panels');
        openSnippetDetail(context, snippet);
    }));

    // openNoteDetail
    subscriptions.push(vscode.commands.registerCommand('sniphive.openNoteDetail', async (note: any) => {
        const { openNoteDetail } = await import('../views/panels');
        openNoteDetail(context, note);
    }));

    context.subscriptions.push(...subscriptions);
}

function mapVscodeLanguage(langId: string): string | null {
    const map: Record<string, string> = {
        'javascript': 'javascript',
        'javascriptreact': 'javascript',
        'typescript': 'typescript',
        'typescriptreact': 'typescript',
        'python': 'python',
        'php': 'php',
        'java': 'java',
        'kotlin': 'kotlin',
        'swift': 'swift',
        'go': 'go',
        'rust': 'rust',
        'c': 'c',
        'cpp': 'cpp',
        'csharp': 'csharp',
        'ruby': 'ruby',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'sql': 'sql',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'markdown': 'markdown',
        'shellscript': 'bash',
        'powershell': 'powershell',
        'dockerfile': 'dockerfile',
        'vue': 'vue',
        'svelte': 'svelte',
        'graphql': 'graphql',
    };
    return map[langId] || null;
}
