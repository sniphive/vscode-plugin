import * as vscode from 'vscode';
import { SnipHiveApiService } from '../services/SnipHiveApiService';
import { E2EEService } from '../crypto/E2EEService';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { NoteCacheService } from '../services/NoteCacheService';
import { getSupportedLanguages } from '../config/settings';
import { getWebviewHtml } from './WebviewHelper';
import { outputChannel } from '../extension';

export function showLoginPanel(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel('sniphiveLogin', 'SnipHive Login', vscode.ViewColumn.One, { enableScripts: true });

    const body = `
<h1>SnipHive</h1>
<p style="margin-bottom:16px;color:var(--vscode-descriptionForeground)">Login to access your snippets and notes</p>
<div class="form-group"><label for="email">Email</label><input type="email" id="email" placeholder="your@email.com"></div>
<div class="form-group"><label for="password">Password</label><input type="password" id="password" placeholder="Password"></div>
<div class="error" id="error"></div>
<div class="actions">
    <button onclick="doLogin()">Login</button>
    <button class="secondary" onclick="register()">Register</button>
</div>`;

    const script = `
        const vscode = acquireVsCodeApi();
        document.getElementById('password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
        function doLogin() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const err = document.getElementById('error');
            err.classList.remove('visible');
            if (!email) { err.textContent = 'Email is required'; err.classList.add('visible'); return; }
            if (!password) { err.textContent = 'Password is required'; err.classList.add('visible'); return; }
            vscode.postMessage({ cmd: 'login', email, password });
        }
        function register() { vscode.postMessage({ cmd: 'register' }); }
        window.addEventListener('message', e => {
            if (e.data.cmd === 'error') { document.getElementById('error').textContent = e.data.message; document.getElementById('error').classList.add('visible'); }
            if (e.data.cmd === 'close') { /* panel will be disposed */ }
        });`;

    panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, 'SnipHive Login', body, script);

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.cmd === 'login') {
            const auth = (await import('../services/SnipHiveAuthService')).SnipHiveAuthService.getInstance();
            const result = await auth.login(msg.email, msg.password);
            if (result.success) {
                panel.dispose();
                vscode.commands.executeCommand('sniphive.afterLogin');
            } else {
                panel.webview.postMessage({ cmd: 'error', message: result.message });
            }
        }
        if (msg.cmd === 'register') {
            vscode.env.openExternal(vscode.Uri.parse('https://sniphive.net/register'));
        }
    });
}

export function showUnlockPanel(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel('sniphiveUnlock', 'Unlock E2EE', vscode.ViewColumn.One, { enableScripts: true });

    const body = `
<h1>🔒 Unlock Encrypted Content</h1>
<p style="margin-bottom:16px;color:var(--vscode-descriptionForeground)">Your snippets and notes are encrypted. Enter your master password to access them.</p>
<div class="form-group"><label for="password">Master Password</label><input type="password" id="password" placeholder="Master password"></div>
<div class="error" id="error"></div>
<div class="actions">
    <button onclick="unlock()">Unlock</button>
    <button class="secondary" onclick="recover()">Use Recovery Code</button>
    <button class="secondary" onclick="logout()">Logout</button>
</div>`;

    const script = `
        const vscode = acquireVsCodeApi();
        document.getElementById('password').addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });
        function unlock() {
            const p = document.getElementById('password').value;
            if (!p) { showError('Master password is required'); return; }
            vscode.postMessage({ cmd: 'unlock', password: p });
        }
        function recover() { vscode.postMessage({ cmd: 'recover' }); }
        function logout() { vscode.postMessage({ cmd: 'logout' }); }
        function showError(m) { const e=document.getElementById('error'); e.textContent=m; e.classList.add('visible'); }
        window.addEventListener('message', e => { if (e.data.cmd === 'error') showError(e.data.message); });`;

    panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, 'Unlock E2EE', body, script);

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.cmd === 'unlock') {
            const e2ee = E2EEService.getInstance();
            const ok = await e2ee.unlockAndStore(msg.password);
            if (ok) {
                panel.dispose();
                vscode.commands.executeCommand('sniphive.afterUnlock');
            } else {
                panel.webview.postMessage({ cmd: 'error', message: 'Invalid master password. Please try again.' });
            }
        }
        if (msg.cmd === 'recover') {
            const code = await vscode.window.showInputBox({ prompt: 'Enter recovery code', password: true });
            if (code) {
                const e2ee = E2EEService.getInstance();
                const ok = await e2ee.recoverWithCode(code);
                if (ok) {
                    panel.dispose();
                    vscode.commands.executeCommand('sniphive.afterUnlock');
                } else {
                    vscode.window.showErrorMessage('Invalid recovery code.');
                }
            }
        }
        if (msg.cmd === 'logout') {
            panel.dispose();
            vscode.commands.executeCommand('sniphive.logout');
        }
    });
}

export function showCreateSnippetPanel(context: vscode.ExtensionContext, prefill?: { content?: string; language?: string }) {
    const panel = vscode.window.createWebviewPanel('sniphiveCreateSnippet', 'Create Snippet', vscode.ViewColumn.One, { enableScripts: true });
    const languages = getSupportedLanguages();
    const langOptions = languages.map(l => `<option value="${l}" ${prefill?.language === l ? 'selected' : ''}>${l}</option>`).join('');

    const body = `
<h1>Create Snippet</h1>
<div class="form-group"><label for="title">Title *</label><input type="text" id="title" placeholder="Snippet title"></div>
<div class="form-group"><label for="content">Content *</label><textarea id="content" placeholder="Paste your code here">${(prefill?.content || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea></div>
<div class="form-group"><label for="language">Language</label><select id="language"><option value="">None</option>${langOptions}</select></div>
<div class="form-group"><label><input type="checkbox" id="encrypt"> Encrypt (E2EE)</label></div>
<div class="error" id="error"></div>
<div class="actions">
    <button onclick="create()">Create</button>
    <button class="secondary" onclick="cancel()">Cancel</button>
</div>`;

    const script = `
        const vscode = acquireVsCodeApi();
        function create() {
            const title = document.getElementById('title').value.trim();
            const content = document.getElementById('content').value;
            const language = document.getElementById('language').value;
            const encrypt = document.getElementById('encrypt').checked;
            if (!title) { showError('Title is required'); return; }
            if (!content) { showError('Content is required'); return; }
            vscode.postMessage({ cmd: 'create', title, content, language, encrypt });
        }
        function cancel() { vscode.postMessage({ cmd: 'cancel' }); }
        function showError(m) { const e=document.getElementById('error'); e.textContent=m; e.classList.add('visible'); }
        window.addEventListener('message', e => { if (e.data.cmd === 'error') showError(e.data.message); });`;

    panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, 'Create Snippet', body, script);

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.cmd === 'cancel') { panel.dispose(); return; }
        if (msg.cmd === 'create') {
            const api = SnipHiveApiService.getInstance();
            const e2ee = E2EEService.getInstance();
            let content = msg.content;
            let encryptedDek: string | undefined;
            if (msg.encrypt) {
                const enc = await e2ee.encryptContent(content);
                if (!enc) { panel.webview.postMessage({ cmd: 'error', message: 'Encryption failed' }); return; }
                content = enc.encryptedContent;
                encryptedDek = enc.encryptedDEK;
            }
            const snippet = await api.createSnippet(msg.title, content, msg.language || '', [], encryptedDek);
            if (snippet) {
                SnippetCacheService.getInstance().updateSnippet(snippet);
                panel.dispose();
            } else {
                panel.webview.postMessage({ cmd: 'error', message: 'Failed to create snippet' });
            }
        }
    });
}

export function showE2EESetupPanel(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel('sniphiveSetupE2EE', 'Setup E2EE', vscode.ViewColumn.One, { enableScripts: true });

    const body = `
<h1>🔐 Setup End-to-End Encryption</h1>
<p style="margin-bottom:16px;color:var(--vscode-descriptionForeground)">E2EE encrypts your snippets so only you can read them. Choose a strong master password.</p>
<div class="form-group"><label for="password">Master Password</label><input type="password" id="password" placeholder="Minimum 8 characters" minlength="8"></div>
<div class="form-group"><label for="confirm">Confirm Password</label><input type="password" id="confirm" placeholder="Confirm your password"></div>
<div class="error" id="error"></div>
<div class="actions">
    <button onclick="setup()">Setup E2EE</button>
    <button class="secondary" onclick="cancel()">Cancel</button>
</div>`;

    const script = `
        const vscode = acquireVsCodeApi();
        function setup() {
            const p = document.getElementById('password').value;
            const c = document.getElementById('confirm').value;
            if (!p || p.length < 8) { showError('Password must be at least 8 characters'); return; }
            if (p !== c) { showError('Passwords do not match'); return; }
            vscode.postMessage({ cmd: 'setup', password: p });
        }
        function cancel() { vscode.postMessage({ cmd: 'cancel' }); }
        function showError(m) { const e=document.getElementById('error'); e.textContent=m; e.classList.add('visible'); }
        window.addEventListener('message', e => { if (e.data.cmd === 'error') showError(e.data.message); if (e.data.cmd === 'success') { alert('E2EE setup complete! Save your recovery codes.'); } });`;

    panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, 'Setup E2EE', body, script);

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.cmd === 'cancel') { panel.dispose(); return; }
        if (msg.cmd === 'setup') {
            const e2ee = E2EEService.getInstance();
            const result = await e2ee.setupE2EE(msg.password);
            if (result.success) {
                vscode.window.showInformationMessage('E2EE setup complete! Your data is now encrypted.');
                panel.dispose();
                vscode.commands.executeCommand('sniphive.afterUnlock');
            } else {
                panel.webview.postMessage({ cmd: 'error', message: result.message || 'Setup failed' });
            }
        }
    });
}

export function showGistImportPanel(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel('sniphiveGistImport', 'Import GitHub Gist', vscode.ViewColumn.One, { enableScripts: true });

    const body = `
<h1>Import GitHub Gist</h1>
<div class="form-group"><label for="token">GitHub Personal Access Token</label><input type="password" id="token" placeholder="ghp_..."></div>
<div class="form-group"><label for="gistUrl">Gist URL</label><input type="text" id="gistUrl" placeholder="https://gist.github.com/user/gist-id"></div>
<div class="form-group"><label><input type="checkbox" id="encrypt"> Encrypt imported gist</label></div>
<div class="error" id="error"></div>
<div class="actions">
    <button onclick="importGist()">Import</button>
    <button class="secondary" onclick="cancel()">Cancel</button>
</div>`;

    const script = `
        const vscode = acquireVsCodeApi();
        function importGist() {
            const token = document.getElementById('token').value.trim();
            const url = document.getElementById('gistUrl').value.trim();
            const encrypt = document.getElementById('encrypt').checked;
            if (!token) { showError('GitHub token is required'); return; }
            if (!url) { showError('Gist URL is required'); return; }
            vscode.postMessage({ cmd: 'import', token, url, encrypt });
        }
        function cancel() { vscode.postMessage({ cmd: 'cancel' }); }
        function showError(m) { const e=document.getElementById('error'); e.textContent=m; e.classList.add('visible'); }
        window.addEventListener('message', e => { if (e.data.cmd === 'error') showError(e.data.message); });`;

    panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, 'Import Gist', body, script);

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.cmd === 'cancel') { panel.dispose(); return; }
        if (msg.cmd === 'import') {
            const api = SnipHiveApiService.getInstance();
            const gistId = msg.url.split('/').pop();
            const result = await api.importGist(msg.token, [gistId], msg.encrypt);
            if (result) {
                vscode.window.showInformationMessage('Gist imported successfully!');
                SnippetCacheService.getInstance().refresh();
                panel.dispose();
            } else {
                panel.webview.postMessage({ cmd: 'error', message: 'Import failed. Check token and Gist URL.' });
            }
        }
    });
}
