import * as vscode from 'vscode';
import { outputChannel } from '../extension';

export function wrapCommand(commandFn: (...args: any[]) => Promise<any> | any) {
    return async (...args: any[]) => {
        try {
            await commandFn(...args);
        } catch (error: any) {
            outputChannel.appendLine(`Command error: ${error.message}`);
            if (error.stack) {
                outputChannel.appendLine(error.stack);
            }
            vscode.window.showErrorMessage(`Error executing command: ${error.message}`);
        }
    };
}
