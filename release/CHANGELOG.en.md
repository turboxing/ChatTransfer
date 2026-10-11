# Changelog

All notable changes to this project. Current version: **v2.0.9.3**

[中文](./CHANGELOG.md) | [English](./CHANGELOG.en.md) | [العربية](./CHANGELOG.ar.md)

---

## v2.0.9.3 (2026-10-11)

- Added server-side SQLite chat history: group and private messages are persisted, so new and offline devices can sync history after coming online
- Added cursor-based incremental history sync and message deduplication, and fixed blank text bubbles for restored messages
- Added "Clear my local history" and "Clear server conversation history"; the latter removes conversation messages and related files
- Improved release packaging: the SQLite native module is bundled and packages are built on native macOS/Windows runners

## v2.0.9.2 (2026-10-09)

- Open-source source repository with trilingual README, MIT License, contribution guide, and development docs
- Fix CI dependency installation order so frontend dependencies are installed before tests

## v2.0.9.1 (2026-08-25)

- Added custom cache folder: change the cache (uploads) folder in Settings, with optional file migration, applied after restart
- Cache path now shows a "(custom)" tag to distinguish custom paths from the default

## v2.0.9.0 (2026-08-08)

- Added custom nickname: enter a nickname at login, changeable anytime, synced across all clients in real time
- Added custom group name: any member can rename the group, synced across all clients in real time
- Added user IP display: each message shows the sender's LAN IP address below their nickname
- Added online count: the chat header shows the current number of online users
- Improved login flow: nickname is cached and auto-filled on next visit

## v2.0.8.9 (2026-06-16)

- Added feedback feature: new feedback entry at the bottom of home page and in the common features sidebar, click to jump directly to GitHub Issue page
- Optimized user feedback channel: convenient for users to submit issues and suggestions, helping to continuously improve the product

## v2.0.8.8 (2026-05-24)

- Added automatic port retry when the default port is in use (increment by 1, up to 3 attempts)
- Added Pin message feature to keep important messages at the top
- Added batch drag-and-drop file upload
- Optimized message bubble display
- Fixed known issues
