import * as vscode from 'vscode';
import { Snippet, isEncrypted } from '../models/Snippet';
import { Note } from '../models/Note';
import { getWebviewHtml, getNonce } from './WebviewHelper';
import { SnipHiveApiService } from '../services/SnipHiveApiService';
import { E2EEService } from '../crypto/E2EEService';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { NoteCacheService } from '../services/NoteCacheService';
import { outputChannel } from '../extension';

export function openSnippetDetail(context: vscode.ExtensionContext, snippet: Snippet) {
    const panel = vscode.window.createWebviewPanel('sniphiveSnippetDetail', snippet.title, vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: false });
    renderSnippetDetail(context, panel, snippet);
}

function escapeHtml(s: string) { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }
function escapeJs(s: string) { 
    return s ? s.replace(/\\/g,'\\\\')
                .replace(/'/g,"\\'")
                .replace(/"/g,'\\"')
                .replace(/\n/g,'\\n')
                .replace(/\r/g,'\\r')
                .replace(/\t/g,'\\t')
                .replace(/\0/g,'\\0')
                .replace(/\u2028/g,'\\u2028')
                .replace(/\u2029/g,'\\u2029') : ''; 
}

async function renderSnippetDetail(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, snippet: Snippet) {
    const e2ee = E2EEService.getInstance();
    let content = snippet.content;

    if (isEncrypted(snippet) && e2ee.isUnlocked()) {
        const decrypted = await e2ee.decryptContent(snippet.content, snippet.encrypted_dek!, '', '');
        if (decrypted) content = decrypted;
    }

    const tagButtons = snippet.tags.map(t => `<span class="tag" style="background:${escapeHtml(t.color)}22;color:${escapeHtml(t.color)};border:1px solid ${escapeHtml(t.color)}44">${escapeHtml(t.name)}</span>`).join('');

    const body = `
<h1>${escapeHtml(snippet.title)}</h1>
<div style="margin:8px 0">
    ${snippet.language ? `<span class="badge">${escapeHtml(snippet.language)}</span>` : ''}
    ${isEncrypted(snippet) ? '<span class="badge">🔒 Encrypted</span>' : ''}
    ${snippet.is_pinned ? '<span class="badge">📌 Pinned</span>' : ''}
    ${snippet.is_favorite ? '<span class="badge">⭐ Favorite</span>' : ''}
</div>
<div>${tagButtons}</div>
<h2>Content</h2>
<pre class="code">${escapeHtml(content)}</pre>
<div class="meta">Created: ${new Date(snippet.created_at).toLocaleString()} · Updated: ${new Date(snippet.updated_at).toLocaleString()}</div>
<div class="actions">
    <button id="btn-edit">Edit</button>
    <button id="btn-copy">Copy</button>
    <button id="btn-pin">${snippet.is_pinned ? 'Unpin' : 'Pin'}</button>
    <button id="btn-fav">${snippet.is_favorite ? 'Unfavorite' : 'Favorite'}</button>
    <button class="secondary" id="btn-archive">Archive</button>
    <button class="danger" id="btn-delete">Delete</button>
</div>`;

    const script = `
        const vscode = acquireVsCodeApi();
        const snippetId = ${snippet.id};
        const snippetSlug = '${escapeJs(snippet.slug)}';
        
        document.getElementById('btn-edit').addEventListener('click', () => {
            vscode.postMessage({
                cmd: 'edit',
                id: snippetId,
                slug: snippetSlug,
                title: ${JSON.stringify(snippet.title)},
                content: ${JSON.stringify(content)},
                language: ${JSON.stringify(snippet.language || '')}
            });
        });
        
        document.getElementById('btn-copy').addEventListener('click', () => {
            vscode.postMessage({
                cmd: 'copy',
                content: ${JSON.stringify(content)}
            });
        });
        
        document.getElementById('btn-pin').addEventListener('click', () => {
            vscode.postMessage({ cmd: 'togglePin', slug: snippetSlug });
        });
        
        document.getElementById('btn-fav').addEventListener('click', () => {
            vscode.postMessage({ cmd: 'toggleFav', slug: snippetSlug });
        });
        
        document.getElementById('btn-archive').addEventListener('click', () => {
            vscode.postMessage({ cmd: 'archive', slug: snippetSlug });
        });
        
        document.getElementById('btn-delete').addEventListener('click', () => {
            vscode.postMessage({ cmd: 'delete', slug: snippetSlug });
        });`;

    panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, snippet.title, body, script);

    panel.webview.onDidReceiveMessage(async (msg) => {
        const api = SnipHiveApiService.getInstance();
        const snippetCache = SnippetCacheService.getInstance();
        switch (msg.cmd) {
            case 'copy':
                await vscode.env.clipboard.writeText(msg.content);
                vscode.window.showInformationMessage('Copied to clipboard');
                break;
            case 'togglePin': {
                const updated = await api.toggleSnippetPin(msg.slug);
                if (updated) { snippetCache.updateSnippet(updated); panel.dispose(); }
                break;
            }
            case 'toggleFav': {
                const updated = await api.toggleSnippetFavorite(msg.slug);
                if (updated) { snippetCache.updateSnippet(updated); panel.dispose(); }
                break;
            }
            case 'archive': {
                const updated = await api.archiveSnippet(msg.slug);
                if (updated) { snippetCache.updateSnippet(updated); panel.dispose(); }
                break;
            }
            case 'delete': {
                const ok = await api.deleteSnippet(msg.slug);
                if (ok) { snippetCache.removeSnippet(snippet.id); panel.dispose(); }
                break;
            }
        }
    });
}

export function openNoteDetail(context: vscode.ExtensionContext, note: Note) {
    const panel = vscode.window.createWebviewPanel('sniphiveNoteDetail', note.title, vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: false });
    renderNoteDetail(context, panel, note);
}

async function renderNoteDetail(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, note: Note) {
    const e2ee = E2EEService.getInstance();
    let content = note.content;

    const isEncrypted = note.encrypted_dek !== null && note.encrypted_dek !== undefined && note.encrypted_dek !== '';
    if (isEncrypted && e2ee.isUnlocked()) {
        const decrypted = await e2ee.decryptContent(note.content, note.encrypted_dek!, '', '');
        if (decrypted) content = decrypted;
    }

    const tagButtons = note.tags.map(t => `<span class="tag" style="background:${escapeHtml(t.color)}22;color:${escapeHtml(t.color)};border:1px solid ${escapeHtml(t.color)}44">${escapeHtml(t.name)}</span>`).join('');

    const body = `
<h1>${escapeHtml(note.title)}</h1>
<div style="margin:8px 0">
    ${isEncrypted ? '<span class="badge">🔒 Encrypted</span>' : ''}
    ${note.is_pinned ? '<span class="badge">📌 Pinned</span>' : ''}
    ${note.is_favorite ? '<span class="badge">⭐ Favorite</span>' : ''}
</div>
<div>${tagButtons}</div>
<h2>Content</h2>
<pre class="code" style="white-space: pre-wrap; font-family: monospace;">${escapeHtml(content)}</pre>
<div class="meta">Created: ${new Date(note.created_at).toLocaleString()} · Updated: ${new Date(note.updated_at).toLocaleString()}</div>
<div class="actions">
    <button id="btn-edit">Edit</button>
    <button id="btn-copy">Copy</button>
    <button id="btn-pin">${note.is_pinned ? 'Unpin' : 'Pin'}</button>
    <button id="btn-fav">${note.is_favorite ? 'Unfavorite' : 'Favorite'}</button>
    <button class="secondary" id="btn-archive">Archive</button>
    <button class="danger" id="btn-delete">Delete</button>
</div>`;

    const script = `
        const vscode = acquireVsCodeApi();
        const noteId = ${note.id};
        const noteSlug = '${escapeJs(note.slug)}';
        
        document.getElementById('btn-edit').addEventListener('click', () => {
            vscode.postMessage({
                cmd: 'edit',
                id: noteId,
                slug: noteSlug,
                title: ${JSON.stringify(note.title)},
                content: ${JSON.stringify(content)}
            });
        });
        
        document.getElementById('btn-copy').addEventListener('click', () => {
            vscode.postMessage({
                cmd: 'copy',
                content: ${JSON.stringify(content)}
            });
        });
        
        document.getElementById('btn-pin').addEventListener('click', () => {
            vscode.postMessage({ cmd: 'togglePin', slug: noteSlug });
        });
        
        document.getElementById('btn-fav').addEventListener('click', () => {
            vscode.postMessage({ cmd: 'toggleFav', slug: noteSlug });
        });
        
        document.getElementById('btn-archive').addEventListener('click', () => {
            vscode.postMessage({ cmd: 'archive', slug: noteSlug });
        });
        
        document.getElementById('btn-delete').addEventListener('click', () => {
            vscode.postMessage({ cmd: 'delete', slug: noteSlug });
        });`;

    panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, note.title, body, script);

    panel.webview.onDidReceiveMessage(async (msg) => {
        const api = SnipHiveApiService.getInstance();
        const noteCache = NoteCacheService.getInstance();
        switch (msg.cmd) {
            case 'edit':
                vscode.commands.executeCommand('sniphive.editNote', msg);
                break;
            case 'copy':
                await vscode.env.clipboard.writeText(msg.content);
                vscode.window.showInformationMessage('Copied to clipboard');
                break;
            case 'togglePin': {
                const updated = await api.toggleNotePin(msg.slug);
                if (updated) { noteCache.updateNote(updated); panel.dispose(); }
                break;
            }
            case 'toggleFav': {
                const updated = await api.toggleNoteFavorite(msg.slug);
                if (updated) { noteCache.updateNote(updated); panel.dispose(); }
                break;
            }
            case 'archive': {
                const updated = await api.archiveNote(msg.slug);
                if (updated) { noteCache.updateNote(updated); panel.dispose(); }
                break;
            }
            case 'delete': {
                const ok = await api.deleteNote(msg.slug);
                if (ok) { noteCache.removeNote(note.id); panel.dispose(); }
                break;
            }
        }
    });
}
