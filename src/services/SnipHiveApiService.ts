import { SnipHiveApiClient } from './SnipHiveApiClient';
import { SnipHiveAuthService } from './SnipHiveAuthService';
import { getApiUrl } from '../config/settings';
import { Snippet } from '../models/Snippet';
import { Note } from '../models/Note';
import { Tag } from '../models/Tag';
import { Workspace } from '../models/Workspace';
import { SecurityStatus } from '../models/Auth';

export class SnipHiveApiService {
    private static instance: SnipHiveApiService;
    private client: SnipHiveApiClient;

    private constructor() {
        this.client = SnipHiveApiClient.getInstance();
    }

    static getInstance(): SnipHiveApiService {
        if (!this.instance) {
            this.instance = new SnipHiveApiService();
        }
        return this.instance;
    }

    private async getAuth(): Promise<{ token: string; workspaceId: string; apiUrl: string } | null> {
        const auth = SnipHiveAuthService.getInstance();
        const token = await auth.getToken();
        if (!token) return null;
        const wsId = auth.getWorkspaceId() || '';
        return { token, workspaceId: wsId, apiUrl: getApiUrl() };
    }

    // ─── Snippets ──────────────────────────────────────────────

    async getSnippets(): Promise<Snippet[]> {
        const auth = await this.getAuth();
        if (!auth) return [];
        return this.client.getPaginated<Snippet>(
            auth.apiUrl, '/api/v1/snippets', auth.token, auth.workspaceId || undefined
        );
    }

    async getSnippet(slug: string): Promise<Snippet | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.get<Snippet>(
            auth.apiUrl, `/api/v1/snippets/${slug}`, auth.token, undefined, auth.workspaceId || undefined
        );
        return res.success ? (res.data || null) : null;
    }

    async createSnippet(title: string, content: string, language: string, tags: string[] = [], encryptedDek?: string, isPublic?: boolean): Promise<Snippet | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const body: any = { title, content, language, tags };
        if (auth.workspaceId) body.workspace_id = auth.workspaceId;
        if (encryptedDek) body.encrypted_dek = encryptedDek;
        if (isPublic !== undefined) body.is_public = isPublic;
        const res = await this.client.post<Snippet>(auth.apiUrl, '/api/v1/snippets', auth.token, body, auth.workspaceId || undefined);
        return res.success ? (res.data || null) : null;
    }

    async updateSnippet(slug: string, fields: Record<string, any>): Promise<Snippet | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.put<Snippet>(auth.apiUrl, `/api/v1/snippets/${slug}`, auth.token, fields, auth.workspaceId || undefined);
        return res.success ? (res.data || null) : null;
    }

    async deleteSnippet(slug: string): Promise<boolean> {
        const auth = await this.getAuth();
        if (!auth) return false;
        const res = await this.client.delete(auth.apiUrl, `/api/v1/snippets/${slug}`, auth.token, auth.workspaceId || undefined);
        return res.success;
    }

    async toggleSnippetPin(slug: string): Promise<Snippet | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.post<Snippet>(auth.apiUrl, `/api/v1/snippets/${slug}/pin`, auth.token, undefined, auth.workspaceId || undefined);
        return res.success ? (res.data || null) : null;
    }

    async toggleSnippetFavorite(slug: string): Promise<Snippet | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.post<Snippet>(auth.apiUrl, `/api/v1/snippets/${slug}/favorite`, auth.token, undefined, auth.workspaceId || undefined);
        return res.success ? (res.data || null) : null;
    }

    async archiveSnippet(slug: string): Promise<Snippet | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.post<Snippet>(
            auth.apiUrl, `/api/v1/snippets/${slug}/archive`, auth.token, undefined, auth.workspaceId || undefined
        );
        return res.success ? (res.data || null) : null;
    }

    // ─── Notes ─────────────────────────────────────────────────

    async getNotes(): Promise<Note[]> {
        const auth = await this.getAuth();
        if (!auth) return [];
        return this.client.getPaginated<Note>(
            auth.apiUrl, '/api/v1/notes', auth.token, auth.workspaceId || undefined
        );
    }

    async getNote(slug: string): Promise<Note | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.get<Note>(
            auth.apiUrl, `/api/v1/notes/${slug}`, auth.token, undefined, auth.workspaceId || undefined
        );
        return res.success ? (res.data || null) : null;
    }

    async createNote(title: string, content: string, tags: string[] = [], encryptedDek?: string, isPublic?: boolean): Promise<Note | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const body: any = { title, content, tags };
        if (auth.workspaceId) body.workspace_id = auth.workspaceId;
        if (encryptedDek) body.encrypted_dek = encryptedDek;
        if (isPublic !== undefined) body.is_public = isPublic;
        const res = await this.client.post<Note>(auth.apiUrl, '/api/v1/notes', auth.token, body, auth.workspaceId || undefined);
        return res.success ? (res.data || null) : null;
    }

    async updateNote(slug: string, fields: Record<string, any>): Promise<Note | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.put<Note>(auth.apiUrl, `/api/v1/notes/${slug}`, auth.token, fields, auth.workspaceId || undefined);
        return res.success ? (res.data || null) : null;
    }

    async deleteNote(slug: string): Promise<boolean> {
        const auth = await this.getAuth();
        if (!auth) return false;
        const res = await this.client.delete(auth.apiUrl, `/api/v1/notes/${slug}`, auth.token, auth.workspaceId || undefined);
        return res.success;
    }

    async toggleNotePin(slug: string): Promise<Note | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.post<Note>(auth.apiUrl, `/api/v1/notes/${slug}/pin`, auth.token, undefined, auth.workspaceId || undefined);
        return res.success ? (res.data || null) : null;
    }

    async toggleNoteFavorite(slug: string): Promise<Note | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.post<Note>(auth.apiUrl, `/api/v1/notes/${slug}/favorite`, auth.token, undefined, auth.workspaceId || undefined);
        return res.success ? (res.data || null) : null;
    }

    async archiveNote(slug: string): Promise<Note | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.post<Note>(
            auth.apiUrl, `/api/v1/notes/${slug}/archive`, auth.token, undefined, auth.workspaceId || undefined
        );
        return res.success ? (res.data || null) : null;
    }

    // ─── Tags ──────────────────────────────────────────────────

    async getTags(): Promise<Tag[]> {
        const auth = await this.getAuth();
        if (!auth) return [];
        return this.client.getPaginated<Tag>(
            auth.apiUrl, '/api/v1/tags', auth.token, auth.workspaceId || undefined
        );
    }

    async createTag(name: string, color: string): Promise<Tag | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.post<Tag>(auth.apiUrl, '/api/v1/tags', auth.token, { name, color, workspace_id: auth.workspaceId }, auth.workspaceId || undefined);
        return res.success ? (res.data || null) : null;
    }

    async updateTag(id: number, name?: string, color?: string): Promise<Tag | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const body: any = {};
        if (name) body.name = name;
        if (color) body.color = color;
        const res = await this.client.put<Tag>(auth.apiUrl, `/api/v1/tags/${id}`, auth.token, body, auth.workspaceId || undefined);
        return res.success ? (res.data || null) : null;
    }

    async deleteTag(id: number): Promise<boolean> {
        const auth = await this.getAuth();
        if (!auth) return false;
        const res = await this.client.delete(auth.apiUrl, `/api/v1/tags/${id}`, auth.token, auth.workspaceId || undefined);
        return res.success;
    }

    // ─── Workspaces ────────────────────────────────────────────

    async getWorkspaces(): Promise<Workspace[]> {
        const auth = await this.getAuth();
        if (!auth) return [];
        return this.client.getPaginated<Workspace>(
            auth.apiUrl, '/api/v1/workspaces', auth.token, undefined
        );
    }

    async getWorkspace(uuid: string): Promise<Workspace | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.get<Workspace>(auth.apiUrl, `/api/v1/workspaces/${uuid}`, auth.token);
        return res.success ? (res.data || null) : null;
    }

    // ─── Gists ─────────────────────────────────────────────────

    async getGistImports(): Promise<any[]> {
        const auth = await this.getAuth();
        if (!auth) return [];
        return this.client.getPaginated<any>(auth.apiUrl, '/api/v1/gists', auth.token, auth.workspaceId || undefined);
    }

    async importGist(githubToken: string, gistIds: string[], encrypt: boolean = false): Promise<any> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const endpoint = encrypt ? '/api/v1/gists/import-encrypted' : '/api/v1/gists/import';
        const res = await this.client.post<any>(auth.apiUrl, endpoint, auth.token, {
            github_token: githubToken,
            gist_ids: gistIds,
            encrypt,
        }, auth.workspaceId || undefined);
        return res.success ? res.data : null;
    }

    // ─── Security ──────────────────────────────────────────────

    async getSecurityStatus(): Promise<SecurityStatus | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.get<SecurityStatus>(auth.apiUrl, '/api/v1/security/status', auth.token);
        return res.success ? (res.data || null) : null;
    }

    async setupE2EE(payload: Record<string, any>): Promise<boolean> {
        const auth = await this.getAuth();
        if (!auth) return false;
        const res = await this.client.post(auth.apiUrl, '/api/v1/security/setup', auth.token, payload);
        return res.success;
    }

    async recoverE2EE(recoveryCode: string): Promise<Record<string, any> | null> {
        const auth = await this.getAuth();
        if (!auth) return null;
        const res = await this.client.post<Record<string, any>>(auth.apiUrl, '/api/v1/security/recover', auth.token, { recovery_code: recoveryCode });
        return res.success ? (res.data || null) : null;
    }

    // ─── Search ────────────────────────────────────────────────

    async search(query: string, type?: string, language?: string, tags?: string[]): Promise<any[]> {
        const auth = await this.getAuth();
        if (!auth) return [];
        const params: Record<string, string> = { q: query };
        if (type) params.type = type;
        if (language) params.language = language;
        if (tags && tags.length) params.tags = tags.join(',');
        const res = await this.client.get<any>(auth!.apiUrl, '/api/v1/search', auth!.token, params, auth!.workspaceId || undefined);
        if (res.success && res.data) {
            const d = res.data as any;
            return d.data || d || [];
        }
        return [];
    }
}
