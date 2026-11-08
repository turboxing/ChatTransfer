# Telemetry Guide

ChatTransfer uses anonymous, aggregate telemetry to understand active hosts,
connected users, and message-type usage.

## Default Behavior

- Official release packages are built with a provider key and have telemetry enabled by default.
- Source checkouts without a generated `config/default-analytics.json` are disabled by default.
- A local `config/local.json` can override the generated release configuration.
- No message content, file names, raw user IDs, hostnames, hardware IDs, or OS usernames are collected.

Official package keys are write-only provider keys and can be extracted from a
published package. Rotate the key if it is abused. A self-hosted telemetry proxy
is required if the key must never be present in client artifacts.

## Disabling Telemetry

```bash
chattransfer --no-telemetry
CHATTRANSFER_TELEMETRY=off chattransfer
```

Configuration priority:

```text
CLI > environment > config/local.json > generated release default
```

The no-op provider is selected whenever telemetry is disabled or no key is
available. In that state, ChatTransfer creates no external telemetry requests.

## Release Configuration

The npm and release workflows read `TELEMETRY_API_KEY` from GitHub Actions
Secrets and generate `config/default-analytics.json` before packaging. The
generated file is gitignored and must never be committed.

The generated shape is:

```json
{
  "analytics": {
    "enabled": true,
    "apiKey": "provider-write-key"
  }
}
```

## Events

### `app_install`

Sent once per host installation. The host ID is a random UUID persisted under
the runtime data directory. It is not derived from hardware identifiers.

### `app_start`

Sent once per application start. Events include `host_id`, version, runtime,
OS, and architecture.

### `user_active`

Sent when a host-scoped browser user is active. Raw browser IDs are hashed with
the host ID before transmission, so the same browser is stable within one host
but cannot be correlated across hosts.

### `message_sent`

Sent once for each successfully persisted outgoing message. It includes message
type, chat type, link presence, file category, and size bucket. Message content
and file names are excluded.

### Page Views

The web client reports route `page_view` events through the local `/api/track`
endpoint. The server attaches the host ID before forwarding.

## Privacy Rules

- Do not collect hardware fingerprints, hostnames, OS usernames, message
  content, file names, or raw sender/receiver identifiers.
- Keep events anonymous and aggregate-only.
- Keep `config/local.json` and `config/default-analytics.json` out of Git.
- Do not enable telemetry when no provider key is available.
