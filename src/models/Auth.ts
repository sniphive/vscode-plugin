import { Workspace } from './Workspace';

export interface LoginRequest {
    email: string;
    password: string;
    device_name: string;
}

export interface LoginResponseUser {
    id: number;
    name: string;
    email: string;
}

export interface LoginResponseWorkspace {
    id: number;
    uuid: string;
    name: string;
    type: 'personal' | 'team';
    role: 'owner' | 'admin' | 'member';
}

export interface LoginResponse {
    token: string;
    user: LoginResponseUser;
    workspaces: LoginResponseWorkspace[];
}

export interface E2EEProfile {
    public_key_jwk: string;
    encrypted_private_key: string;
    recovery_encrypted_private_key: string;
    private_key_iv: string;
    recovery_iv: string;
    kdf_salt: string;
    recovery_salt: string;
    kdf_iterations: number;
}

export interface SecurityStatus {
    setup_complete: boolean;
    e2ee_profile: E2EEProfile | null;
}

export interface E2EESetupRequest {
    public_key_jwk: string;
    encrypted_private_key: string;
    recovery_encrypted_private_key: string;
    private_key_iv: string;
    recovery_iv: string;
    kdf_salt: string;
    recovery_salt: string;
    kdf_iterations: number;
}
