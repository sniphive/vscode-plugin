import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './');

        const workspacePath = path.resolve(extensionDevelopmentPath, '..', 'test-fixtures');

        if (!fs.existsSync(workspacePath)) {
            fs.mkdirSync(workspacePath, { recursive: true });
        }

        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        // Discover and run all test files
        const { runTests } = require('./runTestsInDir');
        await runTests(extensionTestsPath);

        console.log('All tests passed!');
    } catch (err) {
        console.error('Test run failed:', err);
        process.exit(1);
    }
}

main();
