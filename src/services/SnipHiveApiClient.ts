import * as vscode from 'vscode';
import { outputChannel } from '../extension';

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode: number;
    headers: Record<string, string>;
}

export class SnipHiveApiClient {
    private static instance: SnipHiveApiClient;

    static getInstance(): SnipHiveApiClient {
        if (!this.instance) {
            this.instance = new SnipHiveApiClient();
        }
        return this.instance;
    }

    private getHeaders(token?: string, workspaceId?: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        if (workspaceId) {
            headers['X-Workspace-Id'] = workspaceId;
        }
        return headers;
    }

    private buildUrl(apiUrl: string, endpoint: string, queryParams?: Record<string, string>): string {
        const base = apiUrl.replace(/\/+$/, '');
        const path = endpoint.replace(/^\/+/, '');
        let url = `${base}/${path}`;
        if (queryParams) {
            const search = new URLSearchParams(queryParams).toString();
            if (search) url += `?${search}`;
        }
        return url;
    }

    private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { ...options, signal: controller.signal as any });
            return res;
        } finally {
            clearTimeout(id);
        }
    }

    private unwrapLaravelData(rawBody: string): string {
        try {
            const parsed = JSON.parse(rawBody);
            if (parsed && typeof parsed === 'object' && 'data' in parsed && !Array.isArray(parsed.data)) {
                return JSON.stringify(parsed.data);
            }
            return rawBody;
        } catch {
            return rawBody;
        }
    }

    async get<T>(
        apiUrl: string,
        endpoint: string,
        token?: string,
        queryParams?: Record<string, string>,
        workspaceId?: string
    ): Promise<ApiResponse<T>> {
        const params: Record<string, string> = { ...queryParams };
        if (workspaceId) {
            params.workspace_id = workspaceId;
        }
        const url = this.buildUrl(apiUrl, endpoint, params);
        outputChannel.appendLine(`GET ${url}`);
        try {
            const res = await this.fetchWithTimeout(url, {
                method: 'GET',
                headers: this.getHeaders(token, workspaceId),
            });
            const rawBody = await res.text();
            return this.handleResponse<T>(res.status, res.headers, rawBody);
        } catch (e: any) {
            return { success: false, error: `Network error: ${e.message}`, statusCode: 500, headers: {} };
        }
    }

    async getPaginated<T>(
        apiUrl: string,
        endpoint: string,
        token: string,
        workspaceId?: string,
        queryParams?: Record<string, string>
    ): Promise<T[]> {
        const allItems: T[] = [];
        let page = 1;
        let lastPage = 1;

        do {
            const params: Record<string, string> = {
                ...queryParams,
                page: page.toString(),
                per_page: '50',
            };
            if (workspaceId) {
                params.workspace_id = workspaceId;
            }

            const url = this.buildUrl(apiUrl, endpoint, params);
            outputChannel.appendLine(`GET (paginated) ${url}`);
            try {
                const res = await this.fetchWithTimeout(url, {
                    method: 'GET',
                    headers: this.getHeaders(token, workspaceId),
                });
                const rawBody = await res.text();
                if (!res.ok) {
                    outputChannel.appendLine(`Paginated fetch failed: ${res.status} ${rawBody}`);
                    break;
                }
                const parsed = JSON.parse(rawBody);
                
                let dataArray = null;
                if (Array.isArray(parsed)) {
                    dataArray = parsed;
                } else if (parsed.data && Array.isArray(parsed.data)) {
                    dataArray = parsed.data;
                } else if (parsed.data && parsed.data.data && Array.isArray(parsed.data.data)) {
                    dataArray = parsed.data.data;
                } else if (parsed.success && parsed.data && Array.isArray(parsed.data)) {
                    dataArray = parsed.data;
                }

                if (dataArray) {
                    for (const item of dataArray) {
                        allItems.push(item as T);
                    }
                } else {
                    outputChannel.appendLine(`Paginated fetch array extraction failed: ${rawBody}`);
                }

                if (parsed.meta && parsed.meta.last_page) {
                    lastPage = parsed.meta.last_page;
                } else {
                    break;
                }
                page++;
            } catch (e: any) {
                outputChannel.appendLine(`Paginated fetch error: ${e.message}`);
                break;
            }
        } while (page <= lastPage);

        return allItems;
    }

    async post<T>(
        apiUrl: string,
        endpoint: string,
        token?: string,
        body?: any,
        workspaceId?: string
    ): Promise<ApiResponse<T>> {
        const url = this.buildUrl(apiUrl, endpoint);
        outputChannel.appendLine(`POST ${url}`);
        try {
            const res = await this.fetchWithTimeout(url, {
                method: 'POST',
                headers: this.getHeaders(token, workspaceId),
                body: body ? JSON.stringify(body) : '{}',
            });
            const rawBody = await res.text();
            return this.handleResponse<T>(res.status, res.headers, rawBody);
        } catch (e: any) {
            return { success: false, error: `Network error: ${e.message}`, statusCode: 500, headers: {} };
        }
    }

    async put<T>(
        apiUrl: string,
        endpoint: string,
        token: string,
        body?: any,
        workspaceId?: string
    ): Promise<ApiResponse<T>> {
        const url = this.buildUrl(apiUrl, endpoint);
        outputChannel.appendLine(`PUT ${url}`);
        try {
            const res = await this.fetchWithTimeout(url, {
                method: 'PUT',
                headers: this.getHeaders(token, workspaceId),
                body: body ? JSON.stringify(body) : '{}',
            });
            const rawBody = await res.text();
            return this.handleResponse<T>(res.status, res.headers, rawBody);
        } catch (e: any) {
            return { success: false, error: `Network error: ${e.message}`, statusCode: 500, headers: {} };
        }
    }

    async delete(
        apiUrl: string,
        endpoint: string,
        token: string,
        workspaceId?: string
    ): Promise<ApiResponse<void>> {
        const url = this.buildUrl(apiUrl, endpoint);
        outputChannel.appendLine(`DELETE ${url}`);
        try {
            const res = await this.fetchWithTimeout(url, {
                method: 'DELETE',
                headers: this.getHeaders(token, workspaceId),
            });
            const rawBody = await res.text();
            if (res.status >= 200 && res.status < 300) {
                return { success: true, statusCode: res.status, headers: {} };
            }
            return this.handleError(res.status, rawBody);
        } catch (e: any) {
            return { success: false, error: `Network error: ${e.message}`, statusCode: 500, headers: {} };
        }
    }

    private handleResponse<T>(statusCode: number, headers: Headers, rawBody: string): ApiResponse<T> {
        const headerMap: Record<string, string> = {};
        headers.forEach((v, k) => { headerMap[k] = v; });

        if (statusCode >= 200 && statusCode < 300) {
            if (statusCode === 204 || !rawBody) {
                return { success: true, statusCode, headers: headerMap };
            }
            try {
                const unwrapped = this.unwrapLaravelData(rawBody);
                const data = JSON.parse(unwrapped) as T;
                return { success: true, data, statusCode, headers: headerMap };
            } catch {
                return { success: false, error: 'Invalid response format', statusCode, headers: {} };
            }
        }
        return this.handleError(statusCode, rawBody);
    }

    private handleError(statusCode: number, rawBody: string): ApiResponse<any> {
        if (statusCode === 401) {
            outputChannel.appendLine('Received 401 Unauthorized. Triggering logout...');
            vscode.commands.executeCommand('sniphive.logout');
            return { success: false, error: 'Session expired. Please log in again.', statusCode, headers: {} };
        }

        let error = 'Request failed';
        try {
            const parsed = JSON.parse(rawBody);
            if (parsed.message) error = parsed.message;
            if (parsed.error) error = parsed.error;
            if (parsed.errors) {
                const messages = Object.values(parsed.errors).flat().join(', ');
                if (messages) error = messages;
            }
        } catch {}
        return { success: false, error, statusCode, headers: {} };
    }
}
