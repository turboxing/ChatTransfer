# Repository Agent Guidelines

## Project

ChatTransfer is a LAN instant messaging and file transfer tool built with Node.js/Express/Socket.IO and Vue 3.

## Required Commands

Run these commands before handing off a change:

```bash
npm test
cd frontend && npm run build
```

For backend changes, also start the app briefly:

```bash
npm run dev
```

## Directory Boundaries

- `server/` — backend code; keep HTTP, Socket.IO, services and utilities separated.
- `frontend/` — Vue 3 user interface.
- `config/` — runtime configuration; never commit `config.json` or `config/local.json`.
- `tests/` — backend and repository-level regression tests.
- `docs/` — long-form architecture, development and release documentation.

## Change Rules

- Do not commit secrets, API keys, personal cache paths, uploads, logs or release binaries.
- Telemetry is disabled by default and must not run without an explicitly configured user-provided API key.
- Keep edits focused; avoid unrelated formatting or dependency changes.
- Prefer small components, composables and service modules over large monolithic files.
- Keep Socket event names and payload shapes backward compatible unless a release migration is explicitly planned.
- Do not add or remove dependencies unless required by the task.
- Do not commit generated `frontend/dist` or `dist` artifacts.

## Repository Policy

- The intended public repository is `turboxing/ChatTransfer`.
- Do not reference the transitional private source repository in public-facing documentation.
- Preserve existing GitHub Releases and tags when migrating or releasing.
