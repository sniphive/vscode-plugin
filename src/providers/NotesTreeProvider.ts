import * as vscode from 'vscode';
import { NoteCacheService } from '../services/NoteCacheService';
import { Note, isEncrypted } from '../models/Note';
import { SnipHiveTreeItem } from './SnipHiveTreeItem';
import { SnipHiveAuthService } from '../services/SnipHiveAuthService';
import { E2EEService } from '../crypto/E2EEService';

export class NotesTreeProvider implements vscode.TreeDataProvider<SnipHiveTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<SnipHiveTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private cache: NoteCacheService;
    private removeCacheListener: () => void;
    private searchQuery = '';

    constructor() {
        this.cache = NoteCacheService.getInstance();
        this.removeCacheListener = this.cache.onChanged(() => this.refresh());
    }

    dispose() { this.removeCacheListener(); }

    refresh() { this._onDidChangeTreeData.fire(undefined); }
    setSearch(query: string) { this.searchQuery = query; this.refresh(); }

    getTreeItem(element: SnipHiveTreeItem): vscode.TreeItem { return element; }

    getChildren(element?: SnipHiveTreeItem): vscode.ProviderResult<SnipHiveTreeItem[]> {
        if (element) return [];

        const auth = SnipHiveAuthService.getInstance();
        const e2ee = E2EEService.getInstance();

        if (!auth.getUserEmail() || !e2ee.isUnlocked()) {
            return []; // Welcome view'ı tetiklemek için boş dizi dönüyoruz
        }

        let notes = this.cache.getActive();

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            notes = notes.filter(n => {
                const matchTitle = n.title.toLowerCase().includes(q);
                const matchTag = n.tags.some(t => t.name.toLowerCase().includes(q));
                const matchContent = !isEncrypted(n) && n.content.toLowerCase().includes(q);
                return matchTitle || matchTag || matchContent;
            });
        }

        if (notes.length === 0 && this.cache.isLoading()) {
            const loadingItem = new SnipHiveTreeItem('Loading...', -1, '', 'note');
            loadingItem.iconPath = new vscode.ThemeIcon('loading~spin');
            return [loadingItem];
        }

        if (notes.length === 0) {
            const emptyItem = new SnipHiveTreeItem('No notes found', -1, '', 'note');
            emptyItem.iconPath = new vscode.ThemeIcon('info');
            return [emptyItem];
        }

        return notes.map(n => this.toTreeItem(n));
    }

    private toTreeItem(note: Note): SnipHiveTreeItem {
        const item = new SnipHiveTreeItem(note.title, note.id, note.slug, 'note', note.is_public);
        item.setIcon(isEncrypted(note), note.is_favorite, note.is_pinned);
        item.setLanguageDetail(null, isEncrypted(note), note.updated_at);
        item.setTooltip(note.title, note.content, null, note.tags.map(t => t.name), isEncrypted(note));
        item.command = {
            command: 'sniphive.openNoteDetail',
            title: 'Open Note',
            arguments: [note],
        };
        return item;
    }
}
