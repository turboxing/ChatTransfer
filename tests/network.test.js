import { describe, expect, it } from 'vitest';
const { isLoopbackAddress } = require('../server/utils/network');

describe('network utilities', () => {
  it('recognizes loopback addresses used by Socket.IO', () => {
    expect(isLoopbackAddress('127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('::1')).toBe(true);
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('localhost')).toBe(true);
    expect(isLoopbackAddress('192.168.1.10')).toBe(false);
    expect(isLoopbackAddress('')).toBe(false);
    expect(isLoopbackAddress(null)).toBe(false);
  });
});
