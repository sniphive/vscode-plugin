# SnipHive for VS Code

A secure, end-to-end encrypted code snippet manager for Visual Studio Code.

Access your SnipHive code snippets directly in VS Code with full E2EE support. Create, browse, and insert snippets without leaving your development environment.

## Features

- **Sidebar Integration** — Browse and search your snippets and notes in a dedicated sidebar
- **Create from Selection** — Instantly create snippets from selected code (`Shift+Alt+S`)
- **Insert Snippets** — Insert snippets at cursor position (`Shift+Alt+I`)
- **End-to-End Encryption** — Client-side encryption using RSA-4096 OAEP + AES-256-GCM
- **Secure Storage** — Credentials and keys stored in VS Code SecretStorage
- **Multi-Language Support** — Supports 25+ programming languages
- **Tags & Favorites** — Organize snippets with tags, pin favorites, archive old ones
- **Workspace Switching** — Seamlessly switch between personal and team workspaces
- **GitHub Gist Import** — Import your GitHub Gists as snippets

## Security

SnipHive uses industry-standard end-to-end encryption:

- **RSA-4096 OAEP** for key exchange
- **AES-256-GCM** for content encryption
- **PBKDF2** with 600,000 iterations for key derivation
- Your encryption keys never leave your device
- Server never sees your plaintext content

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "SnipHive"
4. Click Install

### From VSIX

```bash
code --install-extension sniphive-0.1.0.vsix
```

## Getting Started

1. Click the SnipHive icon in the activity bar
2. Login with your SnipHive credentials
3. Set up E2EE if prompted (choose a strong master password)
4. Your snippets and notes will load automatically

## Usage

### Creating Snippets

**From Selected Code:**
1. Select code in your editor
2. Press `Shift+Alt+S` (or right-click → Create Snippet)
3. Enter title, select language
4. Click Create

### Inserting Snippets

1. Position your cursor where you want to insert
2. Press `Shift+Alt+I`
3. Search and select a snippet

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Create Snippet | `Shift+Alt+S` |
| Insert Snippet | `Shift+Alt+I` |
| Recent Snippets | `Ctrl+Shift+E` |

## Configuration

Access settings via **File → Preferences → Settings** and search "SnipHive":

- `sniphive.apiUrl` — Custom API URL for self-hosted deployments
- `sniphive.defaultWorkspace` — Default workspace UUID
- `sniphive.autoRefreshInterval` — Auto-refresh interval in seconds (0 = disabled)
- `sniphive.rememberMasterPassword` — Store master password for auto-unlock

## Requirements

- VS Code 1.85.0 or later
- SnipHive account ([sign up](https://sniphive.net/register))

## Development

```bash
npm install
npm run compile
# Press F5 to launch extension development host
```

## License

Copyright © 2024 SnipHive. All rights reserved.
