# Contributing to ChatTransfer

Thanks for helping improve ChatTransfer.

## Development Setup

```bash
npm install
cd frontend && npm install
npm test
cd frontend && npm run build
```

## Branching

Create short-lived feature branches from `main`:

```bash
git checkout -b feat/your-feature
```

## Pull Request Checklist

- Describe the problem and the change.
- Include screenshots or a short recording for UI changes.
- Add or update tests for behavior changes.
- Run `npm test` and `cd frontend && npm run build`.
- Do not commit secrets, local configuration, uploads, logs or release binaries.
- Explain whether and how AI assistance was used.

## Code Guidelines

- Prefer small, focused modules and components.
- Keep backend HTTP routes, services and Socket handlers separated.
- Keep frontend API calls in `frontend/src/api`.
- Keep user-facing strings in i18n files.
- Preserve backward-compatible Socket event payloads unless a migration is explicitly planned.

## Reporting Issues

Open an issue in [GitHub Issues](https://github.com/turboxing/ChatTransfer/issues). Include your platform, version, reproduction steps and relevant logs without sensitive information.
