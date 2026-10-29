# Changelog

All notable changes to this project. Current version: **v2.0.17**

[中文](./CHANGELOG.md) | [English](./CHANGELOG.en.md) | [العربية](./CHANGELOG.ar.md)

---

## v2.0.17 (2026-10-29)

- Fixed blank copyright text on the home page and Tools drawer
- Optimized version info loading to avoid duplicate requests

## v2.0.16 (2026-10-27)

- Fixed the SQLite native module failing to load on Linux distributions with older glibc versions
- Restored compatibility with older enterprise Linux distributions
- Pinned compatible SQLite and prebuild-install versions

## v2.0.15 (2026-10-27)

- Fixed file messages failing to display and open after a service restart
- Fixed user IDs changing in the same browser after a restart, which made sent messages appear as received
- Fixed the chat window scrolling to the bottom when pinning a message

## v2.0.14 (2026-10-21)

- Fixed npm installation failures on Node.js 22
- Upgraded the SQLite native module to 6.0.1 for compatible prebuilt binaries
- Updated the npm runtime requirement to Node.js 20.17 or later

## v2.0.13 (2026-10-20)

- Fixed a security issue that allowed the filesystem root to be used as the cache folder
- Cache path validation now rejects protected directories and their parents, and resolves symlink targets
- Static file serving is now restricted to the `files` subdirectory of the cache folder
- Cache folder write access is verified before saving the configuration
- The saved cache folder is validated at startup and falls back to the default folder when unsafe

## v2.0.12 (2026-10-19)

- Improved first-run onboarding by generating a default nickname automatically and entering chat without manual input
- Kept nickname editing in Tools, so users can still change and sync their nickname anytime

## v2.0.11 (2026-10-18)

- Fixed the CLI treating the default port as explicitly specified, restoring automatic incremental retry when the port is unavailable
- Changed the default port from 55555 to 55556 to avoid a macOS system-reserved port
- CLI startup failures now return a non-zero exit code for scripts and automation

## v2.0.10 (2026-10-18)

- Added npm distribution with `npx chattransfer` and `npm install -g chattransfer`
- Added CLI options: `--host`, `--port`, `--data-dir`, `--public-url`, `--no-browser`, `--version`, and `--help`
- Added an automated npm publication workflow that tests, builds the frontend, and verifies package contents before publishing
- Improved npm runtime data directories so configuration, uploads, and SQLite data are no longer written to the global package directory
- Fixed headless Linux startup compatibility and enabled `xdg-open` support for browsers and cache folders

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
