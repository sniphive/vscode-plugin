import * as vscode from 'vscode';
import { SnippetCacheService } from '../services/SnippetCacheService';
import { E2EEService } from '../crypto/E2EEService';
import { Snippet, isEncrypted } from '../models/Snippet';

/**
 * Maps VS Code language IDs to SnipHive language names.
 */
function mapVscodeLanguage(langId: string): string | null {
    const map: Record<string, string> = {
        'javascript': 'javascript',
        'javascriptreact': 'javascript',
        'typescript': 'typescript',
        'typescriptreact': 'typescript',
        'python': 'python',
        'php': 'php',
        'java': 'java',
        'kotlin': 'kotlin',
        'swift': 'swift',
        'go': 'go',
        'rust': 'rust',
        'c': 'c',
        'cpp': 'cpp',
        'csharp': 'csharp',
        'ruby': 'ruby',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'sql': 'sql',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'markdown': 'markdown',
        'shellscript': 'bash',
        'powershell': 'powershell',
        'dockerfile': 'dockerfile',
        'vue': 'vue',
        'svelte': 'svelte',
        'graphql': 'graphql',
    };
    return map[langId] || null;
}

export class SnippetCompletionProvider implements vscode.CompletionItemProvider {
    private cache: SnippetCacheService;
    private e2ee: E2EEService;

    constructor() {
        this.cache = SnippetCacheService.getInstance();
        this.e2ee = E2EEService.getInstance();
    }

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
        // Only provide completions if authenticated
        const authService = (await import('../services/SnipHiveAuthService')).SnipHiveAuthService.getInstance();
        const tokenStr = await authService.getStoredToken();
        if (!tokenStr) {
            return [];
        }

        const currentLangId = document.languageId;
        const mappedLang = mapVscodeLanguage(currentLangId);

        // Get active snippets from cache
        let snippets = this.cache.getActive();

        // Filter snippets by language
        if (mappedLang) {
            snippets = snippets.filter(s => 
                !s.language || 
                s.language.toLowerCase() === mappedLang.toLowerCase() || 
                s.language.toLowerCase() === 'plaintext'
            );
        }

        const completionItems: vscode.CompletionItem[] = [];

        for (const snippet of snippets) {
            // Check cancellation token
            if (token.isCancellationRequested) {
                return [];
            }

            let content = snippet.content;

            // Decrypt content if encrypted and E2EE is unlocked
            if (isEncrypted(snippet)) {
                if (!this.e2ee.isUnlocked()) {
                    // Skip encrypted snippets if wallet/keys are locked
                    continue;
                }
                try {
                    const decrypted = await this.e2ee.decryptContent(
                        snippet.content,
                        snippet.encrypted_dek!,
                        '',
                        ''
                    );
                    if (decrypted) {
                        content = decrypted;
                    } else {
                        continue;
                    }
                } catch {
                    continue; // Skip if decryption fails
                }
            }

            // Create CompletionItem
            const item = new vscode.CompletionItem(snippet.title, vscode.CompletionItemKind.Snippet);
            item.insertText = new vscode.SnippetString(content);
            item.detail = `SnipHive Snippet (${snippet.language || 'Plain Text'})`;
            
            // Add rich documentation preview
            const previewLines = content.split('\n');
            const preview = previewLines.slice(0, 7).join('\n') + (previewLines.length > 7 ? '\n...' : '');
            
            const doc = new vscode.MarkdownString();
            doc.appendCodeblock(preview, currentLangId);
            if (snippet.tags && snippet.tags.length > 0) {
                doc.appendMarkdown(`\n\n*Tags: ${snippet.tags.map(t => `\`${t.name}\``).join(', ')}*`);
            }
            item.documentation = doc;
            
            // Filter and sort configurations
            item.filterText = snippet.title;
            
            // Boost pinned or favorite items slightly in sorting
            if (snippet.is_pinned) {
                item.sortText = `0_${snippet.title}`;
            } else if (snippet.is_favorite) {
                item.sortText = `1_${snippet.title}`;
            } else {
                item.sortText = `2_${snippet.title}`;
            }

            completionItems.push(item);
        }

        return completionItems;
    }
}
