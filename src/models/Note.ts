import { SnippetUser, SnippetTag } from './Snippet';

export interface Note {
    id: number;
    uuid: string;
    slug: string;
    title: string;
    content: string;
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

export function isEncrypted(note: Note): boolean {
    return note.encrypted_dek !== null && note.encrypted_dek !== undefined && note.encrypted_dek !== '';
}

export function isArchived(note: Note): boolean {
    return note.archived_at !== null && note.archived_at !== undefined;
}
