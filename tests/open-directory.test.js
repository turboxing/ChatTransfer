import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDirectory } from '../server/utils/open-directory';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chattransfer-open-directory-'));

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('openDirectory', () => {
  it('treats Windows explorer exit code 1 as success when the directory exists', async () => {
    const execFileImpl = (command, args, callback) => {
      expect(command).toBe('explorer');
      expect(args).toEqual([tempDir]);
      callback(Object.assign(new Error('Command failed with exit code 1'), { code: 1 }));
    };

    await expect(openDirectory(tempDir, { platform: 'win32', execFileImpl })).resolves.toBeUndefined();
  });

  it('rejects Windows explorer errors other than exit code 1', async () => {
    const execFileImpl = (command, args, callback) => {
      callback(Object.assign(new Error('Command failed with exit code 2'), { code: 2 }));
    };

    await expect(openDirectory(tempDir, { platform: 'win32', execFileImpl })).rejects.toThrow('exit code 2');
  });

  it('rejects Windows explorer exit code 1 when the directory is missing', async () => {
    const missingDir = path.join(tempDir, 'missing');
    const execFileImpl = (command, args, callback) => {
      callback(Object.assign(new Error('Command failed with exit code 1'), { code: 1 }));
    };

    await expect(openDirectory(missingDir, { platform: 'win32', execFileImpl })).rejects.toThrow('exit code 1');
  });
});
