export interface SnippetUser {
    id: number;
    name: string;
    email: string;
}

export interface SnippetTag {
    id: number;
    name: string;
    slug: string;
    color: string;
}

export interface Snippet {
    id: number;
    uuid: string;
    slug: string;
    title: string;
    content: string;
    language: string | null;
    encrypted_dek: string | null;
    is_public: boolean;
    is_pinned: boolean;
    is_favorite: boolean;
    archived_at: string | null;
    url: string;
    public_url: string | null;
    created_at: string;
    updated_at: string;
    user?: SnippetUser;
    tags: SnippetTag[];
}

export function isEncrypted(snippet: Snippet): boolean {
    return snippet.encrypted_dek !== null && snippet.encrypted_dek !== undefined && snippet.encrypted_dek !== '';
}

export function isArchived(snippet: Snippet): boolean {
    return snippet.archived_at !== null && snippet.archived_at !== undefined;
}

export function isValidSnippet(data: any): data is Snippet {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.id !== 'number') return false;
    if (typeof data.title !== 'string') return false;
    if (typeof data.content !== 'string') return false;
    return true;
}
