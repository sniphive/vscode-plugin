import * as vscode from 'vscode';
import { SnipHiveApiService } from '../services/SnipHiveApiService';
import { wrapCommand } from './CommandWrapper';

export function registerTagsCommands(api: SnipHiveApiService): vscode.Disposable[] {
    const subscriptions: vscode.Disposable[] = [];

    subscriptions.push(vscode.commands.registerCommand('sniphive.manageTags', wrapCommand(async () => {
        const tags = await api.getTags();
        const items = tags.map(t => ({
            label: t.name,
            description: `#\${t.color} · \${t.snippets_count} snippets · \${t.notes_count} notes`,
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
            const color = await vscode.window.showInputBox({ 
                prompt: 'Color (hex)', 
                value: '#FF5733',
                validateInput: text => /^#[0-9a-f]{6}$/i.test(text) ? null : 'Invalid hex color (e.g. #FF5733)'
            });
            if (!color) return;
            await api.createTag(name, color);
            vscode.window.showInformationMessage(`Tag "\${name}" created.`);
        } else {
            const action = await vscode.window.showQuickPick(['Edit', 'Delete'], { placeHolder: `Action for "\${pick.tag.name}"` });
            if (action === 'Delete') {
                const yes = await vscode.window.showWarningMessage(`Delete tag "\${pick.tag.name}"?`, { modal: true }, 'Delete');
                if (yes) {
                    await api.deleteTag(pick.tag.id);
                    vscode.window.showInformationMessage('Tag deleted.');
                }
            } else if (action === 'Edit') {
                const name = await vscode.window.showInputBox({ prompt: 'New name', value: pick.tag.name });
                if (!name) return;
                const color = await vscode.window.showInputBox({ 
                    prompt: 'New color (hex)', 
                    value: pick.tag.color,
                    validateInput: text => /^#[0-9a-f]{6}$/i.test(text) ? null : 'Invalid hex color (e.g. #FF5733)'
                });
                if (!color) return;
                await api.updateTag(pick.tag.id, name, color);
                vscode.window.showInformationMessage('Tag updated.');
            }
        }
    })));

    return subscriptions;
}
