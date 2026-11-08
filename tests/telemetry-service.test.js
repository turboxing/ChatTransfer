import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { TelemetryService } = require('../server/telemetry/service');

const cachePath = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-telemetry-'));

afterAll(() => {
  fs.rmSync(cachePath, { recursive: true, force: true });
});

function createService({ enabled = true, apiKey = 'test-key' } = {}) {
  const events = [];
  const provider = {
    trackBatch: vi.fn(async (batch) => {
      events.push(...batch);
    }),
    track: vi.fn()
  };
  const service = new TelemetryService({
    dataDir: cachePath,
    version: '3.0.0',
    runtime: 'test',
    os: 'test-os',
    arch: 'test-arch',
    configLoader: () => ({
      analytics: { enabled, apiKey }
    }),
    providerFactory: () => provider
  });
  service.configure();
  return { service, provider, events };
}

describe('TelemetryService', () => {
  beforeEach(() => {
    fs.rmSync(path.join(cachePath, 'telemetry'), { recursive: true, force: true });
  });

  it('does not create events when telemetry is disabled or missing a key', () => {
    const disabled = createService({ enabled: false });
    const noKey = createService({ apiKey: '' });

    expect(disabled.service.enabled).toBe(false);
    expect(noKey.service.enabled).toBe(false);
    expect(disabled.provider.trackBatch).not.toHaveBeenCalled();
    expect(noKey.provider.trackBatch).not.toHaveBeenCalled();
  });

  it('sends one install event, hashes users, and avoids content in message events', async () => {
    const { service, events } = createService();

    expect(service.enabled).toBe(true);
    await service.flush();
    const install = events.find((event) => event.event_type === 'app_install');
    expect(install).toBeTruthy();
    expect(install.device_id).toBe(service.host.id);
    expect(install.event_properties).toMatchObject({
      host_id: service.host.id,
      app_version: '3.0.0',
      runtime: 'test'
    });
    expect(service.host.installReported).toBe(true);

    await service.trackUserActive('raw-browser-user', { room_type: 'room' });
    await service.trackUserActive('raw-browser-user', { room_type: 'room' });
    await service.trackMessageSent({
      userId: 'raw-browser-user',
      chatType: 'room',
      msgType: 'FILE',
      content: 'https://example.com/private-content',
      fileName: 'secret-name.pdf',
      fileSize: 2048,
      fileType: 'application/pdf'
    });
    await service.flush();

    const userEvent = events.find((event) => event.event_type === 'user_active');
    expect(userEvent.user_id).toHaveLength(32);
    expect(userEvent.user_id).not.toBe('raw-browser-user');
    expect(events.filter((event) => event.event_type === 'user_active')).toHaveLength(1);

    const messageEvent = events.find((event) => event.event_type === 'message_sent');
    expect(messageEvent.event_properties).toMatchObject({
      chat_type: 'room',
      msg_type: 'FILE',
      has_link: true,
      file_category: 'document',
      file_size_bucket: '<1MB'
    });
    expect(JSON.stringify(messageEvent)).not.toContain('secret-name.pdf');
    expect(JSON.stringify(messageEvent)).not.toContain('private-content');
  });
});
