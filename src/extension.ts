import * as vscode from 'vscode';
import { SnipHiveAuthService } from './services/SnipHiveAuthService';
import { SnipHiveApiService } from './services/SnipHiveApiService';
import { SnippetCacheService } from './services/SnippetCacheService';
import { NoteCacheService } from './services/NoteCacheService';
import { E2EEService } from './crypto/E2EEService';
import { getSettings, onSettingsChange } from './config/settings';
import { StatusBarManager } from './status/StatusBarManager';
import { SidebarManager } from './views/SidebarManager';
import { registerCommands } from './commands/index';
import { SnippetCompletionProvider } from './providers/SnippetCompletionProvider';
import { SidebarWebviewProvider } from './views/SidebarWebviewProvider';

const outputChannel = vscode.window.createOutputChannel('SnipHive');

let sidebarManager: SidebarManager | undefined;
let e2eeService: E2EEService | undefined;
let snippetCache: SnippetCacheService | undefined;
let noteCache: NoteCacheService | undefined;

export function activate(context: vscode.ExtensionContext) {
    outputChannel.appendLine('SnipHive extension activating...');

    const authService = SnipHiveAuthService.getInstance(context);
    const apiService = SnipHiveApiService.getInstance();
    snippetCache = SnippetCacheService.getInstance();
    noteCache = NoteCacheService.getInstance();
    e2eeService = E2EEService.getInstance(context);

    const statusBar = new StatusBarManager(context);

    sidebarManager = new SidebarManager(
        context,
        authService,
        apiService,
        snippetCache,
        noteCache,
        e2eeService
    );

    registerCommands(context, authService, apiService, snippetCache, noteCache, e2eeService, sidebarManager, statusBar);

    sidebarWebviewProvider = new SidebarWebviewProvider(
        context,
        authService,
        e2eeService
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('sniphiveSidebarWebview', sidebarWebviewProvider),
        vscode.window.registerTreeDataProvider('sniphiveSnippets', sidebarManager.snippetsProvider),
        vscode.window.registerTreeDataProvider('sniphiveNotes', sidebarManager.notesProvider),
        vscode.window.registerTreeDataProvider('sniphiveFavorites', sidebarManager.favoritesProvider),
        vscode.window.registerTreeDataProvider('sniphivePinned', sidebarManager.pinnedProvider),
        vscode.window.registerTreeDataProvider('sniphiveArchive', sidebarManager.archiveProvider),
        vscode.languages.registerCompletionItemProvider({ pattern: '**' }, new SnippetCompletionProvider()),
        onSettingsChange(() => {
            if (sidebarManager) sidebarManager.onSettingsChanged();
        })
    );

    handleStartup(context, authService, apiService, e2eeService, statusBar, sidebarManager, snippetCache, noteCache);

    outputChannel.appendLine('SnipHive extension activated.');
}

let sidebarWebviewProvider: SidebarWebviewProvider | undefined;

export function updateContexts(authenticated: boolean, unlocked: boolean) {
    vscode.commands.executeCommand('setContext', 'sniphive.authenticated', authenticated);
    vscode.commands.executeCommand('setContext', 'sniphive.unlocked', unlocked);
    if (sidebarWebviewProvider) {
        sidebarWebviewProvider.updateHtml();
    }
}

async function handleStartup(
    context: vscode.ExtensionContext,
    auth: SnipHiveAuthService,
    api: SnipHiveApiService,
    e2ee: E2EEService,
    statusBar: StatusBarManager,
    sidebar: SidebarManager,
    snippetCache: SnippetCacheService,
    noteCache: NoteCacheService
) {
    statusBar.setState('loading');

    const token = await auth.getStoredToken();
    if (!token) {
        statusBar.setState('logged-out');
        updateContexts(false, false);
        sidebar.showLoginPrompt();
        return;
    }

    const isValid = await auth.validateToken();
    if (!isValid) {
        await auth.clearToken();
        statusBar.setState('logged-out');
        updateContexts(false, false);
        sidebar.showLoginPrompt();
        return;
    }

    const securityStatus = await api.getSecurityStatus();
    if (!securityStatus || !securityStatus.setup_complete) {
        statusBar.setState('authenticated-unlocked');
        updateContexts(true, true);
        await sidebar.loadAllData();
        return;
    }

    const privateKey = await e2ee.getPrivateKey();
    if (privateKey) {
        statusBar.setState('ready', auth.getUserEmail() || undefined);
        updateContexts(true, true);
        await sidebar.loadAllData();
        return;
    }

    const settings = getSettings();
    if (settings.rememberMasterPassword) {
        const autoUnlocked = await e2ee.tryAutoUnlock();
        if (autoUnlocked) {
            statusBar.setState('ready', auth.getUserEmail() || undefined);
            updateContexts(true, true);
            await sidebar.loadAllData();
            return;
        }
    }

    statusBar.setState('authenticated-locked');
    updateContexts(true, false);
    sidebar.showMasterPasswordPrompt();
}

export function deactivate() {
    outputChannel.appendLine('SnipHive extension deactivated.');
    if (sidebarManager) sidebarManager.dispose();
    if (e2eeService) e2eeService.clearPrivateKey();
    if (snippetCache) snippetCache.stopAutoRefresh();
    if (noteCache) noteCache.stopAutoRefresh();
}

export { outputChannel };
