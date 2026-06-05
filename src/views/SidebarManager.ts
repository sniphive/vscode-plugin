import * as vscode from 'vscode';
import { SnipHiveAuthService } from '../services/SnipHiveAuthService';
import { SnipHiveApiService } from '../services/SnipHiveApiService';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { NoteCacheService } from '../services/NoteCacheService';
import { E2EEService } from '../crypto/E2EEService';
import { SnippetsTreeProvider } from '../providers/SnippetsTreeProvider';
import { NotesTreeProvider } from '../providers/NotesTreeProvider';
import { UnifiedTreeProvider } from '../providers/UnifiedTreeProvider';

export class SidebarManager {
    readonly snippetsProvider: SnippetsTreeProvider;
    readonly notesProvider: NotesTreeProvider;
    readonly favoritesProvider: UnifiedTreeProvider;
    readonly pinnedProvider: UnifiedTreeProvider;
    readonly archiveProvider: UnifiedTreeProvider;

    private context: vscode.ExtensionContext;
    private auth: SnipHiveAuthService;
    private api: SnipHiveApiService;
    private snippetCache: SnippetCacheService;
    private noteCache: NoteCacheService;
    private e2ee: E2EEService;

    constructor(
        context: vscode.ExtensionContext,
        auth: SnipHiveAuthService,
        api: SnipHiveApiService,
        snippetCache: SnippetCacheService,
        noteCache: NoteCacheService,
        e2ee: E2EEService,
    ) {
        this.context = context;
        this.auth = auth;
        this.api = api;
        this.snippetCache = snippetCache;
        this.noteCache = noteCache;
        this.e2ee = e2ee;

        this.snippetsProvider = new SnippetsTreeProvider();
        this.notesProvider = new NotesTreeProvider();
        this.favoritesProvider = new UnifiedTreeProvider('favorites');
        this.pinnedProvider = new UnifiedTreeProvider('pinned');
        this.archiveProvider = new UnifiedTreeProvider('archived');
    }

    async loadAllData() {
        this.snippetCache.startAutoRefresh();
        this.noteCache.startAutoRefresh();
        await Promise.all([
            this.snippetCache.refresh(),
            this.noteCache.refresh(),
        ]);
    }

    showLoginPrompt() {
        vscode.commands.executeCommand('sniphive.showLogin');
    }

    showMasterPasswordPrompt() {
        vscode.commands.executeCommand('sniphive.showUnlock');
    }

    onSettingsChanged() {
        this.snippetCache.startAutoRefresh();
        this.noteCache.startAutoRefresh();
    }

    dispose() {
        this.snippetsProvider.dispose();
        this.notesProvider.dispose();
        this.favoritesProvider.dispose();
        this.pinnedProvider.dispose();
        this.archiveProvider.dispose();
        this.snippetCache.stopAutoRefresh();
        this.noteCache.stopAutoRefresh();
    }
}
