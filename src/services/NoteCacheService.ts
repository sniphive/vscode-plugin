import { Note, isArchived } from '../models/Note';
import { SnipHiveApiService } from './SnipHiveApiService';
import { getSettings } from '../config/settings';

type NoteCacheListener = () => void;

export class NoteCacheService {
    private static instance: NoteCacheService;
    private notes: Note[] = [];
    private loading = false;
    private listeners: NoteCacheListener[] = [];
    private refreshTimer: NodeJS.Timeout | null = null;
    private lastRefresh = 0;

    static getInstance(): NoteCacheService {
        if (!this.instance) this.instance = new NoteCacheService();
        return this.instance;
    }

    getAll(): Note[] { return this.notes; }
    isLoading(): boolean { return this.loading; }

    getById(id: number): Note | undefined { return this.notes.find(n => n.id === id); }
    getBySlug(slug: string): Note | undefined { return this.notes.find(n => n.slug === slug); }
    getFavorites(): Note[] { return this.notes.filter(n => n.is_favorite && !isArchived(n)); }
    getPinned(): Note[] { return this.notes.filter(n => n.is_pinned && !isArchived(n)); }
    getArchived(): Note[] { return this.notes.filter(n => isArchived(n)); }
    getActive(): Note[] { return this.notes.filter(n => !isArchived(n)); }

    onChanged(listener: NoteCacheListener): () => void {
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
            this.notes = await api.getNotes();
            this.lastRefresh = Date.now();
        } finally {
            this.loading = false;
            this.notify();
        }
    }

    updateNote(updated: Note) {
        const idx = this.notes.findIndex(n => n.id === updated.id);
        if (idx >= 0) this.notes[idx] = updated;
        else this.notes.push(updated);
        this.notify();
    }

    removeNote(id: number) {
        this.notes = this.notes.filter(n => n.id !== id);
        this.notify();
    }

    clear() {
        this.notes = [];
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
