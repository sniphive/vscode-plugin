export type WorkspaceType = 'personal' | 'team';
export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface Workspace {
    id: number;
    uuid: string;
    name: string;
    type: WorkspaceType;
    role: WorkspaceRole;
    created_at: string;
    updated_at: string;
}
