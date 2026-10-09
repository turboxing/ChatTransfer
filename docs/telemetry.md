# Telemetry Guide

ChatTransfer telemetry is disabled by default. The open-source version never contains a built-in provider key.

## Enabling Telemetry

1. Copy `config/local.example.json` to `config/local.json`.
2. Set `enabled` to `true`.
3. Set `apiKey` to your own provider key.

## Conditions

Telemetry only runs when both conditions are true:

```json
{
  "analytics": {
    "enabled": true,
    "apiKey": "YOUR_OWN_API_KEY"
  }
}
```

Without a key, the no-op provider is selected and no external request is made.

## Privacy Rules

- Do not collect hardware fingerprints, hostname, OS username or message content by default.
- Keep telemetry events anonymous and aggregate-only.
- Do not commit `config/local.json`.
