import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const releasesJson = JSON.parse(readFileSync('release/releases.json', 'utf8'));

describe('release notes format', () => {
  it('uses the package version as the latest release', () => {
    expect(releasesJson.latest.version).toBe(packageJson.version);
  });

  it('contains the required trilingual changelog sections in order', () => {
    expect(Object.keys(releasesJson.latest.changelog)).toEqual([
      'zh-CN',
      'en',
      'ar'
    ]);
  });

  it('keeps language sections aligned as non-empty bullet sources', () => {
    const changelog = releasesJson.latest.changelog;
    const languageItems = Object.values(changelog);

    expect(languageItems.length).toBe(3);
    expect(new Set(languageItems.map((items) => items.length)).size).toBe(1);
    expect(languageItems[0].length).toBeGreaterThan(0);

    for (const items of languageItems) {
      for (const item of items) {
        expect(typeof item).toBe('string');
        expect(item.trim()).not.toBe('');
        expect(item).not.toMatch(/\r?\n/);
      }
    }
  });
});
