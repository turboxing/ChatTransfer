import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTelemetryProvider } from '../server/telemetry/index';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('analytics', () => {
  it('uses a noop provider without an API key', async () => {
    const provider = createTelemetryProvider({
      analytics: {
        enabled: true,
        apiKey: ''
      }
    });

    await expect(provider.track('test_event')).resolves.toBeUndefined();
  });

  it('uses a noop provider when telemetry is disabled', async () => {
    const provider = createTelemetryProvider({
      analytics: {
        enabled: false,
        apiKey: 'user-key'
      }
    });

    await expect(provider.track('test_event')).resolves.toBeUndefined();
  });
});
