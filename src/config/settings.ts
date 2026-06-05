import * as vscode from 'vscode';

export interface SnipHiveSettings {
    apiUrl: string;
    defaultWorkspace: string;
    autoRefreshInterval: number;
    rememberMasterPassword: boolean;
}

export function getSettings(): SnipHiveSettings {
    const config = vscode.workspace.getConfiguration('sniphive');
    return {
        apiUrl: config.get<string>('apiUrl', 'https://api.sniphive.net'),
        defaultWorkspace: config.get<string>('defaultWorkspace', ''),
        autoRefreshInterval: config.get<number>('autoRefreshInterval', 0),
        rememberMasterPassword: config.get<boolean>('rememberMasterPassword', true),
    };
}

export function onSettingsChange(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('sniphive')) {
            callback();
        }
    });
}

export function getSupportedLanguages(): string[] {
    return [
        'javascript', 'typescript', 'python', 'php', 'java', 'kotlin',
        'swift', 'go', 'rust', 'c', 'cpp', 'csharp',
        'ruby', 'html', 'css', 'scss', 'sql', 'json',
        'xml', 'yaml', 'markdown', 'bash', 'powershell', 'dockerfile',
        'plaintext', 'vue', 'svelte', 'graphql',
    ];
}

export function getApiUrl(): string {
    return getSettings().apiUrl;
}
