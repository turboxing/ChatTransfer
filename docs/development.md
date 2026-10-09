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
