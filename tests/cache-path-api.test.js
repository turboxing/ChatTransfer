import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { getCachePath } from '../server/config';

describe('cache path API', () => {
  it('parses JSON request bodies before validating the cache path', async () => {
    const { createApp } = await import('../server/index');
    const app = createApp();

    const response = await request(app)
      .post('/setCachePath')
      .send({ path: getCachePath(), migrate: false });

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(-1);
    expect(response.body.message).toBe('invalid cache path');
  });
});
