import * as vscode from 'vscode';
import { SnipHiveApiClient } from './SnipHiveApiClient';
import { LoginResponse } from '../models/Auth';
import { getSettings } from '../config/settings';
import { outputChannel } from '../extension';

const AUTH_TOKEN_KEY = 'sniphive.authToken';
const USER_EMAIL_KEY = 'sniphive.userEmail';
const USER_NAME_KEY = 'sniphive.userName';

export interface LoginResult {
    success: boolean;
    message: string;
    user?: { id: number; name: string; email: string };
}

export class SnipHiveAuthService {
    private static instance: SnipHiveAuthService;
    private secrets: vscode.SecretStorage;
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.secrets = context.secrets;
    }

    static getInstance(context?: vscode.ExtensionContext): SnipHiveAuthService {
        if (!this.instance) {
            if (!context) throw new Error('SnipHiveAuthService not initialized');
            this.instance = new SnipHiveAuthService(context);
        }
        return this.instance;
    }

    async login(email: string, password: string): Promise<LoginResult> {
        try {
            const apiUrl = getSettings().apiUrl;
            const client = SnipHiveApiClient.getInstance();
            const res = await client.post<LoginResponse>(apiUrl, '/api/v1/login', undefined, {
                email: email.trim(),
                password,
                device_name: 'vscode-sniphive',
            });

            if (res.success && res.data) {
                await this.secrets.store(AUTH_TOKEN_KEY + '.' + email, res.data.token);
                await this.context.globalState.update(USER_EMAIL_KEY, email);
                await this.context.globalState.update(USER_NAME_KEY, res.data.user.name);

                let wsId: string | undefined;
                const defaultWs = getSettings().defaultWorkspace;
                if (defaultWs && res.data.workspaces.some(w => (w.uuid || String(w.id)) === defaultWs)) {
                    wsId = defaultWs;
                } else if (res.data.workspaces.length > 0) {
                    const ws = res.data.workspaces[0];
                    wsId = ws.uuid || String(ws.id);
                }

                if (wsId) {
                    await this.context.globalState.update('sniphive.workspaceId', wsId);
                }

                return {
                    success: true,
                    message: 'Login successful',
                    user: res.data.user,
                };
            }
            return { success: false, message: res.error || 'Login failed' };
        } catch (e: any) {
            return { success: false, message: `Login error: ${e.message}` };
        }
    }

    async getStoredToken(): Promise<string | undefined> {
        try {
            const email: string | undefined = this.context.globalState.get(USER_EMAIL_KEY);
            if (!email) return undefined;
            return await this.secrets.get(AUTH_TOKEN_KEY + '.' + email);
        } catch {
            return undefined;
        }
    }

    async validateToken(): Promise<boolean> {
        try {
            const email: string | undefined = this.context.globalState.get(USER_EMAIL_KEY);
            if (!email) return false;
            const token = await this.secrets.get(AUTH_TOKEN_KEY + '.' + email);
            if (!token) return false;

            const apiUrl = getSettings().apiUrl;
            const client = SnipHiveApiClient.getInstance();
            const res = await client.get(apiUrl, '/api/v1/security/status', token);
            return res.success;
        } catch {
            return false;
        }
    }

    getUserEmail(): string | undefined {
        return this.context.globalState.get(USER_EMAIL_KEY);
    }

    getUserName(): string | undefined {
        return this.context.globalState.get(USER_NAME_KEY);
    }

    getWorkspaceId(): string | undefined {
        return this.context.globalState.get('sniphive.workspaceId');
    }

    async setWorkspaceId(wsId: string | undefined): Promise<void> {
        await this.context.globalState.update('sniphive.workspaceId', wsId);
    }

    isAuthenticated(): boolean {
        return !!this.getUserEmail();
    }

    async getToken(): Promise<string | undefined> {
        return this.getStoredToken();
    }

    async clearToken(): Promise<void> {
        const email = this.getUserEmail();
        if (email) {
            await this.secrets.delete(AUTH_TOKEN_KEY + '.' + email);
        }
        await this.context.globalState.update(USER_EMAIL_KEY, undefined);
        await this.context.globalState.update(USER_NAME_KEY, undefined);
    }

    async logout(): Promise<void> {
        outputChannel.appendLine('Logging out...');
        const email = this.getUserEmail();
        if (email) {
            await this.secrets.delete(AUTH_TOKEN_KEY + '.' + email);
            await this.secrets.delete('sniphive.privateKey.' + email);
            await this.secrets.delete('sniphive.masterPassword.' + email);
        }
        await this.context.globalState.update(USER_EMAIL_KEY, undefined);
        await this.context.globalState.update(USER_NAME_KEY, undefined);
        await this.context.globalState.update('sniphive.workspaceId', undefined);
        await this.context.globalState.update('sniphive.e2eeUnlocked', false);
        outputChannel.appendLine('Logout complete.');
    }
}
