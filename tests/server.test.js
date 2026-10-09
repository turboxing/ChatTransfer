import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';

const serverModule = await import('../server/index');
const app = serverModule.createApp();

describe('server API', () => {
  afterAll(() => {
    // Express apps created here do not retain persistent listeners.
  });

  it('returns version metadata', async () => {
    const response = await request(app).get('/getVersionInfo');

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.data.version).toBe('2.0.9.2');
  });

  it('returns login target URL', async () => {
    const response = await request(app).get('/scanLogin?sender=test-user');

    expect(response.status).toBe(200);
    expect(response.body.data.targetUrl).toContain('/chat?sender=test-user');
  });
});
