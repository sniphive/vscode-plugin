import * as vscode from 'vscode';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { Snippet, isEncrypted } from '../models/Snippet';
import { SnipHiveTreeItem } from './SnipHiveTreeItem';
import { SnipHiveAuthService } from '../services/SnipHiveAuthService';
import { E2EEService } from '../crypto/E2EEService';

export class SnippetsTreeProvider implements vscode.TreeDataProvider<SnipHiveTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<SnipHiveTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private cache: SnippetCacheService;
    private removeCacheListener: () => void;
    private searchQuery = '';
    private languageFilter: string | null = null;
    private tagFilters: string[] = [];

    constructor() {
        this.cache = SnippetCacheService.getInstance();
        this.removeCacheListener = this.cache.onChanged(() => this.refresh());
    }

    dispose() { this.removeCacheListener(); }

    refresh() { this._onDidChangeTreeData.fire(undefined); }

    setSearch(query: string) { this.searchQuery = query; this.refresh(); }
    setLanguageFilter(lang: string | null) { this.languageFilter = lang; this.refresh(); }
    setTagFilters(tags: string[]) { this.tagFilters = tags; this.refresh(); }

    getTreeItem(element: SnipHiveTreeItem): vscode.TreeItem { return element; }

    getChildren(element?: SnipHiveTreeItem): vscode.ProviderResult<SnipHiveTreeItem[]> {
        if (element) return [];

        const auth = SnipHiveAuthService.getInstance();
        const e2ee = E2EEService.getInstance();

        if (!auth.getUserEmail() || !e2ee.isUnlocked()) {
            return []; // Welcome view'ı tetiklemek için boş dizi dönüyoruz
        }

        let snippets = this.cache.getActive();

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            snippets = snippets.filter(s =>
                s.title.toLowerCase().includes(q) ||
                s.content.toLowerCase().includes(q) ||
                s.tags.some(t => t.name.toLowerCase().includes(q))
            );
        }

        if (this.languageFilter) {
            snippets = snippets.filter(s => s.language?.toLowerCase() === this.languageFilter?.toLowerCase());
        }

        if (this.tagFilters.length > 0) {
            snippets = snippets.filter(s => s.tags.some(t => this.tagFilters.includes(String(t.id))));
        }

        if (snippets.length === 0 && this.cache.isLoading()) {
            const loadingItem = new SnipHiveTreeItem('Loading...', -1, '', 'snippet');
            loadingItem.iconPath = new vscode.ThemeIcon('loading~spin');
            return [loadingItem];
        }

        if (snippets.length === 0) {
            const emptyItem = new SnipHiveTreeItem('No snippets found', -1, '', 'snippet');
            emptyItem.iconPath = new vscode.ThemeIcon('info');
            emptyItem.tooltip = 'Create your first snippet using Shift+Alt+S';
            return [emptyItem];
        }

        return snippets.map(s => this.toTreeItem(s));
    }

    private toTreeItem(snippet: Snippet): SnipHiveTreeItem {
        const item = new SnipHiveTreeItem(snippet.title, snippet.id, snippet.slug, 'snippet');
        item.setIcon(isEncrypted(snippet), snippet.is_favorite, snippet.is_pinned);
        item.setLanguageDetail(snippet.language, isEncrypted(snippet), snippet.updated_at);
        item.setTooltip(snippet.title, snippet.content, snippet.language, snippet.tags.map(t => t.name));
        item.command = {
            command: 'sniphive.openSnippetDetail',
            title: 'Open Snippet',
            arguments: [snippet],
        };
        return item;
    }
}
