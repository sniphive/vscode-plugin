import * as vscode from 'vscode';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { NoteCacheService } from '../services/NoteCacheService';
import { Snippet, isEncrypted as isSnippetEncrypted } from '../models/Snippet';
import { Note, isEncrypted as isNoteEncrypted } from '../models/Note';
import { SnipHiveTreeItem, ItemType } from './SnipHiveTreeItem';
import { SnipHiveAuthService } from '../services/SnipHiveAuthService';
import { E2EEService } from '../crypto/E2EEService';

export type UnifiedFilterType = 'favorites' | 'pinned' | 'archived';

export class UnifiedTreeProvider implements vscode.TreeDataProvider<SnipHiveTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<SnipHiveTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private filterType: UnifiedFilterType;
    private snippetCache: SnippetCacheService;
    private noteCache: NoteCacheService;
    private removeSnippetListener: () => void;
    private removeNoteListener: () => void;

    constructor(filterType: UnifiedFilterType) {
        this.filterType = filterType;
        this.snippetCache = SnippetCacheService.getInstance();
        this.noteCache = NoteCacheService.getInstance();
        this.removeSnippetListener = this.snippetCache.onChanged(() => this.refresh());
        this.removeNoteListener = this.noteCache.onChanged(() => this.refresh());
    }

    dispose() { this.removeSnippetListener(); this.removeNoteListener(); }
    refresh() { this._onDidChangeTreeData.fire(undefined); }

    getTreeItem(element: SnipHiveTreeItem): vscode.TreeItem { return element; }

    getChildren(element?: SnipHiveTreeItem): vscode.ProviderResult<SnipHiveTreeItem[]> {
        if (element) return [];

        const auth = SnipHiveAuthService.getInstance();
        const e2ee = E2EEService.getInstance();

        if (!auth.getUserEmail() || !e2ee.isUnlocked()) {
            return []; // Welcome view'ı tetiklemek için boş dizi dönüyoruz
        }

        let snippets: Snippet[];
        let notes: Note[];

        switch (this.filterType) {
            case 'favorites':
                snippets = this.snippetCache.getFavorites();
                notes = this.noteCache.getFavorites();
                break;
            case 'pinned':
                snippets = this.snippetCache.getPinned();
                notes = this.noteCache.getPinned();
                break;
            case 'archived':
                snippets = this.snippetCache.getArchived();
                notes = this.noteCache.getArchived();
                break;
        }

        const allItems = [
            ...this.snippetsToItems(snippets),
            ...this.notesToItems(notes),
        ];

        if (allItems.length === 0) {
            const emptyItem = new SnipHiveTreeItem('No items', -1, '', 'snippet');
            emptyItem.iconPath = new vscode.ThemeIcon('info');
            return [emptyItem];
        }

        return allItems;
    }

    private snippetsToItems(snippets: Snippet[]): SnipHiveTreeItem[] {
        return snippets.map(s => {
            const item = new SnipHiveTreeItem(s.title, s.id, s.slug, 'snippet');
            item.setIcon(isSnippetEncrypted(s), s.is_favorite, s.is_pinned);
            item.description = `Snippet · ${s.language || 'text'} · ${new Date(s.updated_at).toLocaleDateString()}`;
            item.command = {
                command: 'sniphive.openSnippetDetail',
                title: 'Open Snippet',
                arguments: [s],
            };
            return item;
        });
    }

    private notesToItems(notes: Note[]): SnipHiveTreeItem[] {
        return notes.map(n => {
            const item = new SnipHiveTreeItem(n.title, n.id, n.slug, 'note');
            item.setIcon(isNoteEncrypted(n), n.is_favorite, n.is_pinned);
            item.description = `Note · ${new Date(n.updated_at).toLocaleDateString()}`;
            item.command = {
                command: 'sniphive.openNoteDetail',
                title: 'Open Note',
                arguments: [n],
            };
            return item;
        });
    }
}
