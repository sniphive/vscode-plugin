import * as vscode from 'vscode';
import { SnipHiveAuthService } from '../services/SnipHiveAuthService';
import { SnipHiveApiService } from '../services/SnipHiveApiService';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { NoteCacheService } from '../services/NoteCacheService';
import { E2EEService } from '../crypto/E2EEService';
import { SidebarManager } from '../views/SidebarManager';
import { StatusBarManager } from '../status/StatusBarManager';

import { registerAuthCommands } from './auth';
import { registerSnippetCommands } from './snippet';
import { registerNoteCommands } from './note';
import { registerWorkspaceCommands } from './workspace';
import { registerTagsCommands } from './tags';
import { registerUICommands } from './ui';

export function registerCommands(
    context: vscode.ExtensionContext,
    auth: SnipHiveAuthService,
    api: SnipHiveApiService,
    snippetCache: SnippetCacheService,
    noteCache: NoteCacheService,
    e2ee: E2EEService,
    sidebar: SidebarManager,
    statusBar: StatusBarManager,
) {
    const subscriptions: vscode.Disposable[] = [
        ...registerAuthCommands(context, auth, api, snippetCache, noteCache, e2ee, sidebar, statusBar),
        ...registerSnippetCommands(context, snippetCache, e2ee),
        ...registerNoteCommands(context),
        ...registerWorkspaceCommands(auth, api),
        ...registerTagsCommands(api),
        ...registerUICommands(context, snippetCache, noteCache)
    ];

    context.subscriptions.push(...subscriptions);
}
