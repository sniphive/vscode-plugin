import * as vscode from 'vscode';

export type ItemType = 'snippet' | 'note';

export class SnipHiveTreeItem extends vscode.TreeItem {
    itemType: ItemType;
    itemId: number;
    slug: string;

    constructor(
        label: string,
        id: number,
        slug: string,
        itemType: ItemType,
        collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ) {
        super(label, collapsibleState);
        this.itemId = id;
        this.slug = slug;
        this.itemType = itemType;
        this.contextValue = itemType === 'snippet' ? 'sniphiveSnippetItem' : 'sniphiveNoteItem';
    }

    setIcon(isEncrypted: boolean, isFavorite: boolean, isPinned: boolean) {
        if (isPinned) {
            this.iconPath = new vscode.ThemeIcon('pinned');
        } else if (isFavorite) {
            this.iconPath = new vscode.ThemeIcon('star-full');
        } else if (isEncrypted) {
            this.iconPath = new vscode.ThemeIcon('lock');
        } else {
            this.iconPath = new vscode.ThemeIcon('symbol-snippet');
        }
    }

    setLanguageDetail(language: string | null, encrypted: boolean, updatedAt: string) {
        const parts: string[] = [];
        if (language) parts.push(language);
        if (encrypted) parts.push('encrypted');
        const date = new Date(updatedAt);
        parts.push(date.toLocaleDateString());
        this.description = parts.join(' · ');
    }

    setTooltip(title: string, content: string, language: string | null, tags: string[], isEncryptedContent: boolean = false) {
        const preview = isEncryptedContent ? '🔒 Encrypted content' : (content.length > 200 ? content.substring(0, 200) + '...' : content);
        const parts: string[] = [title];
        if (language) parts.push(`Language: ${language}`);
        if (tags.length) parts.push(`Tags: ${tags.join(', ')}`);
        parts.push(preview);
        this.tooltip = parts.join('\n');
    }
}
