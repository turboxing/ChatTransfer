# Development Guide

## Requirements

- Node.js 20.17+
- npm 9+

## Commands

```bash
npm install
cd frontend && npm install
npm test
npm run dev
cd frontend && npm run dev
cd frontend && npm run build
```

## Branch Workflow

Use GitHub Flow:

1. Keep `main` releasable and protected.
2. Create a short-lived branch from `main` for each change.
3. Push the branch and open a pull request.
4. Require CI and review before merging.
5. Delete the branch after it merges.
6. Tag releases from `main`.

Branch prefixes: `feature/`, `fix/`, `docs/`, and `hotfix/`.

## Layout

- `server/` contains backend code.
- `frontend/` contains Vue 3 code.
- `tests/` contains backend and repository-level tests.
- `config/local.example.json` shows how to enable telemetry with your own key.

## Telemetry

Telemetry is disabled by default. To enable it locally:

1. Copy `config/local.example.json` to `config/local.json`.
2. Replace `YOUR_OWN_API_KEY` with your own provider key.
3. Keep `enabled` set to `true`.

Without a key, ChatTransfer uses a no-op provider and does not send external requests.

## Retention

Normal rooms are deleted after 7 days without activity by default. The last
active time is updated when a user creates/joins a room, sends a message,
renames a room, or regenerates its room code. A running server checks every
6 hours; on startup it checks before accepting connections.

```bash
# Keep rooms for 30 days
chattransfer --room-idle-retention-days 30

# Disable idle room deletion
chattransfer --room-idle-retention-days 0

# Public Lobby messages are kept for 14 days
chattransfer --public-room-retention-days 14
```

The equivalent environment variables are
`CHATTRANSFER_ROOM_IDLE_RETENTION_DAYS` and
`CHATTRANSFER_PUBLIC_ROOM_RETENTION_DAYS`. Startup arguments take precedence
over environment variables.

## Coding Rules

- Keep files small and focused.
- Avoid global mutable state.
- Do not call APIs directly from UI components.
- Keep Socket payloads backward compatible unless a migration is planned.
- Never commit secrets, local config or generated binaries.
