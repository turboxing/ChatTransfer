import { describe, expect, it } from 'vitest';

describe('package metadata', () => {
  it('uses the confirmed open-source repository', () => {
    const pkg = require('../package.json');

    expect(pkg.repository.url).toBe('https://github.com/turboxing/ChatTransfer.git');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(?:\.\d+)?$/);
  });
});
