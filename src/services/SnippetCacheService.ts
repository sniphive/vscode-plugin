import { Snippet } from '../models/Snippet';
import { SnipHiveApiService } from './SnipHiveApiService';
import { BaseCacheService } from './BaseCacheService';

export class SnippetCacheService extends BaseCacheService<Snippet> {
    private static instance: SnippetCacheService;

    static getInstance(): SnippetCacheService {
        if (!this.instance) this.instance = new SnippetCacheService();
        return this.instance;
    }

    async refresh(): Promise<void> {
        this.loading = true;
        this.notify();
        try {
            const api = SnipHiveApiService.getInstance();
            this.items = await api.getSnippets();
            this.lastRefresh = Date.now();
        } finally {
            this.loading = false;
            this.notify();
        }
    }

    updateSnippet(updated: Snippet) {
        this.updateItem(updated);
    }

    removeSnippet(id: number) {
        this.removeItem(id);
    }
}
