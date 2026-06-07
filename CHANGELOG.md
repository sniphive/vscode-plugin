# Changelog

## 0.2.0

- Added copy public link functionality for snippets and notes
- Fixed E2EE encryption and synchronization issues for public items
- Refactored internal commands and added BaseCacheService
- Resolved code review items (P1-P3)
- Updated extension logo and sidebar icon sizing

## 0.1.0

- Initial release
- Snippet management (create, edit, delete, pin, favorite, archive)
- Note management (create, edit, delete, pin, favorite, archive)
- End-to-end encryption (RSA-4096 OAEP + AES-256-GCM + PBKDF2)
- VS Code sidebar with Snippets, Notes, Favorites, Pinned, Archive views
- Create snippet from selection (`Shift+Alt+S`)
- Insert snippet at cursor (`Shift+Alt+I`)
- Workspace switching
- Tag management with color picker
- GitHub Gist import
- Search and filter (by text, language, tags)
- Status bar indicator
- Custom API URL settings
- Auto-refresh timer
- Master password auto-unlock
