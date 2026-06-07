import * as vscode from 'vscode';
import { showCreateNotePanel, showEditNotePanel } from '../views/webviews';
import { wrapCommand } from './CommandWrapper';

export function registerNoteCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
    const subscriptions: vscode.Disposable[] = [];

    subscriptions.push(vscode.commands.registerCommand('sniphive.createNote', wrapCommand(async () => {
        const editor = vscode.window.activeTextEditor;
        let content = '';
        if (editor && !editor.selection.isEmpty) {
            content = editor.document.getText(editor.selection);
        }
        showCreateNotePanel(context, { content });
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.openNoteDetail', wrapCommand(async (note: any) => {
        const { openNoteDetail } = await import('../views/panels');
        openNoteDetail(context, note);
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.editNote', wrapCommand(async (msg: any) => {
        showEditNotePanel(context, { id: msg.id, slug: msg.slug, title: msg.title, content: msg.content, is_public: msg.is_public });
    })));

    return subscriptions;
}
