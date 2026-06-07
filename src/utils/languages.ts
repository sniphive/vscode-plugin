import * as vscode from 'vscode';

export function mapVscodeLanguage(langId: string): string | null {
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

export async function getSupportedLanguagesAsync(): Promise<string[]> {
    const langs = await vscode.languages.getLanguages();
    // Return unique mapped values or some hardcoded set if needed
    // But since the API requires certain languages, we can just return a fixed list 
    // combined with any mapped ones.
    const mapped = new Set<string>();
    for (const l of langs) {
        const m = mapVscodeLanguage(l);
        if (m) mapped.add(m);
    }
    // Also add defaults in case they are not returned by VS Code context
    const defaults = ['text', 'javascript', 'typescript', 'python', 'php', 'java', 'go', 'rust', 'c', 'cpp', 'csharp', 'ruby', 'html', 'css', 'json', 'yaml', 'markdown', 'bash'];
    for (const d of defaults) mapped.add(d);
    
    return Array.from(mapped).sort();
}
