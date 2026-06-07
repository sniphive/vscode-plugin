import * as vscode from 'vscode';

export function getNonce(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}



export function getWebviewHtml(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    title: string,
    body: string,
    script: string,
    styles: string = ''
): string {
    const nonce = getNonce();
    const csp = `
        default-src 'none';
        style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com;
        script-src 'nonce-${nonce}';
        img-src ${webview.cspSource} https:;
        font-src ${webview.cspSource} https://fonts.gstatic.com;
    `;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${csp.replace(/\s+/g, ' ').trim()}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sanitizeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', var(--vscode-font-family), -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: var(--vscode-font-size, 13px);
            color: var(--vscode-foreground);
            background: linear-gradient(135deg, var(--vscode-editor-background), var(--vscode-sideBar-background, var(--vscode-editor-background)));
            background-attachment: fixed;
            padding: 24px;
            line-height: 1.6;
        }
        h1 { 
            font-size: 1.7em; 
            font-weight: 700; 
            margin-bottom: 8px; 
            letter-spacing: -0.02em; 
            color: var(--vscode-editor-foreground, var(--vscode-foreground));
        }
        h2 { 
            font-size: 1.25em; 
            font-weight: 600; 
            margin: 20px 0 10px; 
            letter-spacing: -0.01em;
            color: var(--vscode-editor-foreground, var(--vscode-foreground));
        }
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 0.8em;
            font-weight: 500;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            margin-right: 8px;
            margin-bottom: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .tag {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 500;
            margin-right: 6px;
            margin-bottom: 6px;
            transition: all 0.2s ease;
        }
        .tag:hover {
            transform: scale(1.05);
            filter: brightness(1.1);
        }
        button {
            padding: 8px 18px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            cursor: pointer;
            font-size: var(--vscode-font-size, 13px);
            font-weight: 500;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        button:hover { 
            background: var(--vscode-button-hoverBackground); 
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        button:active {
            transform: translateY(0);
        }
        button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        button.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-secondaryBackground));
        }
        button.danger { 
            background: #e04545; 
            color: white; 
            border-color: rgba(0, 0, 0, 0.1);
        }
        button.danger:hover {
            background: #ff5454;
        }
        input, textarea, select {
            width: 100%;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.2);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, rgba(255, 255, 255, 0.15));
            border-radius: 6px;
            font-size: var(--vscode-font-size, 13px);
            font-family: 'Inter', var(--vscode-font-family), sans-serif;
            transition: all 0.2s ease;
        }
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 3px rgba(10, 150, 250, 0.2);
            background: rgba(0, 0, 0, 0.3);
        }
        textarea { resize: vertical; min-height: 220px; font-family: var(--vscode-editor-font-family, monospace); }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.9em; opacity: 0.9; }
        .actions { margin-top: 24px; display: flex; gap: 10px; flex-wrap: wrap; }
        .error { 
            color: #ff5454; 
            font-size: 0.9em; 
            margin-top: 10px; 
            display: none; 
            padding: 8px 12px;
            background: rgba(224, 69, 69, 0.1);
            border-radius: 6px;
            border: 1px solid rgba(224, 69, 69, 0.2);
        }
        .error.visible { display: block; }
        pre.code {
            background: rgba(0, 0, 0, 0.25);
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: var(--vscode-editor-font-size, 12px);
            white-space: pre-wrap;
            word-break: break-all;
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
            margin: 12px 0;
            line-height: 1.5;
        }
        .meta { color: var(--vscode-descriptionForeground); font-size: 0.85em; margin-top: 12px; opacity: 0.8; }
        .btn-group { display: flex; gap: 8px; flex-wrap: wrap; }
        
        /* Modern Glassmorphic Container */
        .glass-card {
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
            margin-top: 10px;
        }
        ${styles}
    </style>
</head>
<body>
    <div class="glass-card">
        ${body}
    </div>
    <script nonce="${nonce}">${script}</script>
</body>
</html>`;
}

export function sanitizeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
