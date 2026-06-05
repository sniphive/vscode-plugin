import { Snippet, isArchived } from '../models/Snippet';
import { SnipHiveApiService } from './SnipHiveApiService';
import { getSettings } from '../config/settings';

type SnippetCacheListener = () => void;

export class SnippetCacheService {
    private static instance: SnippetCacheService;
    private snippets: Snippet[] = [];
    private loading = false;
    private listeners: SnippetCacheListener[] = [];
    private refreshTimer: NodeJS.Timeout | null = null;
    private lastRefresh = 0;

    static getInstance(): SnippetCacheService {
        if (!this.instance) this.instance = new SnippetCacheService();
        return this.instance;
    }

    getAll(): Snippet[] { return this.snippets; }
    isLoading(): boolean { return this.loading; }

    getById(id: number): Snippet | undefined {
        return this.snippets.find(s => s.id === id);
    }

    getBySlug(slug: string): Snippet | undefined {
        return this.snippets.find(s => s.slug === slug);
    }

    getFavorites(): Snippet[] { return this.snippets.filter(s => s.is_favorite && !isArchived(s)); }
    getPinned(): Snippet[] { return this.snippets.filter(s => s.is_pinned && !isArchived(s)); }
    getArchived(): Snippet[] { return this.snippets.filter(s => isArchived(s)); }
    getActive(): Snippet[] { return this.snippets.filter(s => !isArchived(s)); }

    onChanged(listener: SnippetCacheListener): () => void {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    private notify() {
        for (const l of this.listeners) l();
    }

    async refresh(): Promise<void> {
        this.loading = true;
        this.notify();
        try {
            const api = SnipHiveApiService.getInstance();
            this.snippets = await api.getSnippets();
            this.lastRefresh = Date.now();
        } finally {
            this.loading = false;
            this.notify();
        }
    }

    updateSnippet(updated: Snippet) {
        const idx = this.snippets.findIndex(s => s.id === updated.id);
        if (idx >= 0) this.snippets[idx] = updated;
        else this.snippets.push(updated);
        this.notify();
    }

    removeSnippet(id: number) {
        this.snippets = this.snippets.filter(s => s.id !== id);
        this.notify();
    }

    clear() {
        this.snippets = [];
        this.notify();
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        const interval = getSettings().autoRefreshInterval;
        if (interval > 0) {
            this.refreshTimer = setInterval(() => this.refresh(), interval * 1000);
        }
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
}
