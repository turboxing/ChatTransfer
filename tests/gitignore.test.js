import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('open-source baseline', () => {
  it('ignores local config and sensitive files', () => {
    const gitignore = readFileSync('.gitignore', 'utf8');

    expect(gitignore).toContain('a.json');
    expect(gitignore).toContain('config.json');
    expect(gitignore).toContain('tempdirs');
  });
});
