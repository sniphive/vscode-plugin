import * as vscode from 'vscode';
import { SnipHiveAuthService } from '../services/SnipHiveAuthService';
import { E2EEService } from '../crypto/E2EEService';
import { getWebviewHtml } from './WebviewHelper';

export class SidebarWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'sniphiveSidebarWebview';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly auth: SnipHiveAuthService,
        private readonly e2ee: E2EEService
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        this.updateHtml();

        // Listen for messages from the webview
        webviewView.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.cmd) {
                case 'login': {
                    const result = await this.auth.login(msg.email, msg.password);
                    if (result.success) {
                        vscode.commands.executeCommand('sniphive.afterLogin');
                    } else {
                        webviewView.webview.postMessage({ cmd: 'error', message: result.message });
                    }
                    break;
                }
                case 'register':
                    vscode.env.openExternal(vscode.Uri.parse('https://sniphive.net/register'));
                    break;
                case 'unlock': {
                    const ok = await this.e2ee.unlockAndStore(msg.password);
                    if (ok) {
                        vscode.commands.executeCommand('sniphive.afterUnlock');
                    } else {
                        webviewView.webview.postMessage({ cmd: 'error', message: 'Invalid master password. Please try again.' });
                    }
                    break;
                }
                case 'recover': {
                    const code = await vscode.window.showInputBox({ prompt: 'Enter recovery code', password: true });
                    if (code) {
                        const ok = await this.e2ee.recoverWithCode(code);
                        if (ok) {
                            vscode.commands.executeCommand('sniphive.afterUnlock');
                        } else {
                            vscode.window.showErrorMessage('Invalid recovery code.');
                        }
                    }
                    break;
                }
                case 'logout':
                    vscode.commands.executeCommand('sniphive.logout');
                    break;
            }
        });
    }

    public updateHtml() {
        if (!this._view) return;

        const email = this.auth.getUserEmail();
        const isAuthenticated = !!email;
        const isUnlocked = this.e2ee.isUnlocked();

        let body = '';
        let script = '';
        let title = 'SnipHive';

        if (!isAuthenticated) {
            title = 'SnipHive Login';
            body = `
                <h1>SnipHive</h1>
                <p style="margin-bottom:16px;color:var(--vscode-descriptionForeground)">Login to access your snippets and notes</p>
                <div class="form-group"><label for="email">Email</label><input type="email" id="email" placeholder="your@email.com"></div>
                <div class="form-group"><label for="password">Password</label><input type="password" id="password" placeholder="Password"></div>
                <div class="error" id="error"></div>
                <div class="actions">
                    <button id="loginBtn">Login</button>
                    <button id="registerBtn" class="secondary">Register</button>
                </div>
            `;
            script = `
                const vscode = acquireVsCodeApi();
                document.getElementById('loginBtn').addEventListener('click', doLogin);
                document.getElementById('registerBtn').addEventListener('click', register);
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
                });
            `;
        } else if (!isUnlocked) {
            title = 'Unlock E2EE';
            body = `
                <h1>🔒 Unlock E2EE</h1>
                <p style="margin-bottom:16px;color:var(--vscode-descriptionForeground)">Enter your master password to access encrypted snippets and notes.</p>
                <div class="form-group"><label for="password">Master Password</label><input type="password" id="password" placeholder="Master password"></div>
                <div class="error" id="error"></div>
                <div class="actions">
                    <button id="unlockBtn">Unlock</button>
                    <button id="recoverBtn" class="secondary">Recovery Code</button>
                    <button id="logoutBtn" class="secondary">Logout</button>
                </div>
            `;
            script = `
                const vscode = acquireVsCodeApi();
                document.getElementById('unlockBtn').addEventListener('click', unlock);
                document.getElementById('recoverBtn').addEventListener('click', recover);
                document.getElementById('logoutBtn').addEventListener('click', logout);
                document.getElementById('password').addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });

                function unlock() {
                    const p = document.getElementById('password').value;
                    if (!p) { showError('Master password is required'); return; }
                    vscode.postMessage({ cmd: 'unlock', password: p });
                }
                function recover() { vscode.postMessage({ cmd: 'recover' }); }
                function logout() { vscode.postMessage({ cmd: 'logout' }); }
                function showError(m) { const e=document.getElementById('error'); e.textContent=m; e.classList.add('visible'); }
                window.addEventListener('message', e => { if (e.data.cmd === 'error') showError(e.data.message); });
            `;
        } else {
            body = `
                <h1>SnipHive Unlocked</h1>
                <p style="color:var(--vscode-descriptionForeground)">Your snippets are loading in the tree views below.</p>
            `;
            script = '';
        }

        this._view.webview.html = getWebviewHtml(
            this._view.webview,
            this.context.extensionUri,
            title,
            body,
            script
        );
    }
}
