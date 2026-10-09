# ChatTransfer Architecture

## Overview

ChatTransfer is a LAN-only instant messaging and file transfer tool. A Node.js server hosts the built Vue application, handles HTTP APIs, receives uploaded files and coordinates real-time messages with Socket.IO.

## Current Structure

```text
server/
├── index.js             # process bootstrap and startup orchestration
├── routes/              # HTTP route modules
├── socket/              # Socket.IO event registration
├── services/            # message decoration and domain logic
├── telemetry/           # optional telemetry providers
├── config/              # new analytics configuration loader
└── utils/               # shared backend utilities

frontend/src/
├── api/                 # HTTP client wrappers
├── composables/         # reusable Vue composition logic
├── components/          # chat UI components
└── views/               # route views
```

## Runtime Flow

1. `server/index.js` resolves an available port and creates the Express app.
2. `server/routes/index.js` registers static hosting, upload middleware and route modules.
3. `server/socket/index.js` registers Socket.IO events.
4. `RoomManager` maintains in-memory user and group state.
5. Message handlers decorate messages and broadcast them to the group or a private socket.
6. Files are stored in the configured uploads cache directory.

## Telemetry

Telemetry is disabled by default. A telemetry provider is only created when both `enabled` and a user-provided `apiKey` are present. With no key, a no-op provider is used and no external request is made.

## Target Boundaries

- HTTP routes convert requests and responses only.
- Domain logic belongs in services.
- Socket handlers translate protocol events into service calls.
- Frontend components do not call `fetch` directly; use `frontend/src/api`.
- Reusable frontend logic belongs in composables.
- User identity and room state belong to an explicit manager, not global variables.
