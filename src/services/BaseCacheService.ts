import { getSettings } from '../config/settings';

export type CacheListener = () => void;

export interface CacheableEntity {
    id: number;
    slug: string;
    is_favorite: boolean;
    is_pinned: boolean;
    archived_at: string | null;
}

export abstract class BaseCacheService<T extends CacheableEntity> {
    protected items: T[] = [];
    protected loading = false;
    protected listeners: CacheListener[] = [];
    protected refreshTimer: NodeJS.Timeout | null = null;
    protected lastRefresh = 0;

    getAll(): T[] { return this.items; }
    isLoading(): boolean { return this.loading; }

    getById(id: number): T | undefined { return this.items.find(i => i.id === id); }
    getBySlug(slug: string): T | undefined { return this.items.find(i => i.slug === slug); }
    getFavorites(): T[] { return this.items.filter(i => i.is_favorite && !this.isArchived(i)); }
    getPinned(): T[] { return this.items.filter(i => i.is_pinned && !this.isArchived(i)); }
    getArchived(): T[] { return this.items.filter(i => this.isArchived(i)); }
    getActive(): T[] { return this.items.filter(i => !this.isArchived(i)); }

    onChanged(listener: CacheListener): () => void {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    protected notify() {
        for (const l of this.listeners) l();
    }

    abstract refresh(): Promise<void>;

    updateItem(updated: T) {
        const idx = this.items.findIndex(i => i.id === updated.id);
        if (idx >= 0) this.items[idx] = updated;
        else this.items.push(updated);
        this.notify();
    }

    removeItem(id: number) {
        this.items = this.items.filter(i => i.id !== id);
        this.notify();
    }

    clear() {
        this.items = [];
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

    protected isArchived(item: T): boolean {
        return item.archived_at !== null && item.archived_at !== undefined;
    }
}
