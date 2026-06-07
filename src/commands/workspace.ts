import * as vscode from 'vscode';
import { SnipHiveAuthService } from '../services/SnipHiveAuthService';
import { SnipHiveApiService } from '../services/SnipHiveApiService';
import { wrapCommand } from './CommandWrapper';

export function registerWorkspaceCommands(
    auth: SnipHiveAuthService,
    api: SnipHiveApiService
): vscode.Disposable[] {
    const subscriptions: vscode.Disposable[] = [];

    subscriptions.push(vscode.commands.registerCommand('sniphive.switchWorkspace', wrapCommand(async () => {
        const workspaces = await api.getWorkspaces();
        if (!workspaces || workspaces.length === 0) {
            vscode.window.showInformationMessage('No workspaces found.');
            return;
        }

        const currentWsId = auth.getWorkspaceId();

        const items = workspaces.map(w => ({
            label: w.name,
            description: (w.uuid || String(w.id)) === currentWsId ? '(Current)' : '',
            workspace: w
        }));

        const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Select a workspace' });
        if (pick) {
            const wsId = pick.workspace.uuid || String(pick.workspace.id);
            if (wsId !== currentWsId) {
                await auth.setWorkspaceId(wsId);
                await vscode.workspace.getConfiguration('sniphive').update('defaultWorkspace', wsId, true);
                
                vscode.window.showInformationMessage(`Switched to workspace: \${pick.workspace.name}`);
                vscode.commands.executeCommand('sniphive.refresh');
            }
        }
    })));

    return subscriptions;
}
