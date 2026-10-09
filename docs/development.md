# Development Guide

## Requirements

- Node.js 20+
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

## Coding Rules

- Keep files small and focused.
- Avoid global mutable state.
- Do not call APIs directly from UI components.
- Keep Socket payloads backward compatible unless a migration is planned.
- Never commit secrets, local config or generated binaries.
