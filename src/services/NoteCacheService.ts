import { Note } from '../models/Note';
import { SnipHiveApiService } from './SnipHiveApiService';
import { BaseCacheService } from './BaseCacheService';

export class NoteCacheService extends BaseCacheService<Note> {
    private static instance: NoteCacheService;

    static getInstance(): NoteCacheService {
        if (!this.instance) this.instance = new NoteCacheService();
        return this.instance;
    }

    async refresh(): Promise<void> {
        this.loading = true;
        this.notify();
        try {
            const api = SnipHiveApiService.getInstance();
            this.items = await api.getNotes();
            this.lastRefresh = Date.now();
        } finally {
            this.loading = false;
            this.notify();
        }
    }

    updateNote(updated: Note) {
        this.updateItem(updated);
    }

    removeNote(id: number) {
        this.removeItem(id);
    }
}
