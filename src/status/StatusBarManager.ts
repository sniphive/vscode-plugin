import * as vscode from 'vscode';
import { SnipHiveAuthService } from '../services/SnipHiveAuthService';

type StatusState = 'loading' | 'logged-out' | 'authenticated-locked' | 'authenticated-unlocked' | 'ready';

export class StatusBarManager {
    private item: vscode.StatusBarItem;
    private auth: SnipHiveAuthService;

    constructor(context: vscode.ExtensionContext) {
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.auth = SnipHiveAuthService.getInstance();
        context.subscriptions.push(this.item);
        this.item.command = 'sniphive.focus';
        this.item.show();
    }

    setState(state: StatusState, label?: string) {
        switch (state) {
            case 'loading':
                this.item.text = '$(loading~spin) SnipHive';
                this.item.tooltip = 'SnipHive is initializing...';
                break;
            case 'logged-out':
                this.item.text = '$(sign-in) SnipHive: Login';
                this.item.tooltip = 'Click to open SnipHive sidebar and login';
                break;
            case 'authenticated-locked':
                this.item.text = '$(lock) SnipHive: Unlock';
                this.item.tooltip = 'E2EE is locked. Click to unlock.';
                break;
            case 'authenticated-unlocked':
                this.item.text = '$(unlock) SnipHive';
                this.item.tooltip = 'Authenticated. E2EE not set up.';
                break;
            case 'ready':
                this.item.text = '$(shield) SnipHive';
                if (label) {
                    this.item.tooltip = `SnipHive ready · ${label}`;
                }
                break;
        }
    }

    dispose() {
        this.item.dispose();
    }
}
