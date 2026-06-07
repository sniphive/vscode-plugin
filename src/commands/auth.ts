import * as vscode from 'vscode';
import { SnipHiveAuthService } from '../services/SnipHiveAuthService';
import { SnipHiveApiService } from '../services/SnipHiveApiService';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { NoteCacheService } from '../services/NoteCacheService';
import { E2EEService } from '../crypto/E2EEService';
import { StatusBarManager } from '../status/StatusBarManager';
import { SidebarManager } from '../views/SidebarManager';
import { showLoginPanel, showUnlockPanel, showE2EESetupPanel } from '../views/webviews';
import { wrapCommand } from './CommandWrapper';

export function registerAuthCommands(
    context: vscode.ExtensionContext,
    auth: SnipHiveAuthService,
    api: SnipHiveApiService,
    snippetCache: SnippetCacheService,
    noteCache: NoteCacheService,
    e2ee: E2EEService,
    sidebar: SidebarManager,
    statusBar: StatusBarManager
): vscode.Disposable[] {
    const subscriptions: vscode.Disposable[] = [];

    subscriptions.push(vscode.commands.registerCommand('sniphive.logout', wrapCommand(async () => {
        await auth.logout();
        snippetCache.clear();
        noteCache.clear();
        e2ee.clearPrivateKey();
        statusBar.setState('logged-out');
        const { updateContexts } = await import('../extension');
        updateContexts(false, false);
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.showLogin', wrapCommand(() => {
        showLoginPanel(context);
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.showUnlock', wrapCommand(() => {
        showUnlockPanel(context);
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.setupE2EE', wrapCommand(() => {
        showE2EESetupPanel(context);
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.afterLogin', wrapCommand(async () => {
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
    })));

    subscriptions.push(vscode.commands.registerCommand('sniphive.afterUnlock', wrapCommand(async () => {
        statusBar.setState('ready', auth.getUserEmail());
        const { updateContexts } = await import('../extension');
        updateContexts(true, true);
        await sidebar.loadAllData();
    })));

    return subscriptions;
}
