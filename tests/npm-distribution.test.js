import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { parseCliArguments, toStartOptions } from '../server/cli-options';
import { getCachePath, getConfigFile } from '../server/config';
import {
  getDefaultDataDir,
  getDatabaseFile
} from '../server/utils/runtime-paths';
import {
  normalizePublicUrl,
  resolveStartOptions,
  shouldOpenBrowser
} from '../server/utils/runtime-options';

describe('npm distribution', () => {
  it('parses supported CLI arguments', () => {
    const values = parseCliArguments([
      '--host', '127.0.0.1',
      '--port', '55560',
      '--data-dir', '/tmp/chattransfer-data',
      '--public-url', 'http://192.168.1.10:55560',
      '--no-browser'
    ]);

    expect(values).toEqual({
      host: '127.0.0.1',
      port: '55560',
      'data-dir': '/tmp/chattransfer-data',
      'public-url': 'http://192.168.1.10:55560',
      'no-browser': true,
      version: false,
      help: false
    });
  });

  it('rejects unsupported CLI arguments', () => {
    expect(() => parseCliArguments(['--unknown'])).toThrow();
  });

  it('resolves CLI options with environment variable fallback', () => {
    vi.stubEnv('CHATTRANSFER_HOST', '127.0.0.1');
    vi.stubEnv('CHATTRANSFER_PORT', '55561');
    vi.stubEnv('CHATTRANSFER_DATA_DIR', '/tmp/chattransfer-env-data');
    vi.stubEnv('CHATTRANSFER_PUBLIC_URL', 'http://chattransfer.example');
    vi.stubEnv('CHATTRANSFER_NO_BROWSER', '1');

    const options = toStartOptions({});

    expect(options).toMatchObject({
      host: '127.0.0.1',
      port: 55561,
      explicitPort: true,
      dataDir: '/tmp/chattransfer-env-data',
      publicUrl: 'http://chattransfer.example',
      openBrowser: false
    });

    vi.unstubAllEnvs();
  });

  it('gives CLI values precedence over environment variables', () => {
    vi.stubEnv('CHATTRANSFER_PORT', '55561');

    const options = toStartOptions({ port: '55562' });

    expect(options.port).toBe(55562);
    expect(options.explicitPort).toBe(true);

    vi.unstubAllEnvs();
  });

  it('keeps the default CLI port implicit after resolving options twice', () => {
    const options = toStartOptions({});
    const resolvedAgain = resolveStartOptions(options);

    expect(resolvedAgain.port).toBe(55556);
    expect(resolvedAgain.explicitPort).toBe(false);
  });

  it('returns a non-zero exit code when the explicit port is unavailable', async () => {
    const blocker = net.createServer();
    await new Promise((resolve) => blocker.listen(0, '0.0.0.0', resolve));
    const { port } = blocker.address();
    const child = spawn(process.execPath, [
      'bin/chattransfer.js',
      '--no-browser',
      '--port',
      String(port)
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const exitCode = await new Promise((resolve) => child.once('exit', resolve));
    await new Promise((resolve) => blocker.close(resolve));

    expect(exitCode).toBe(1);
    expect(output).toContain(`Port ${port} is in use`);
  });

  it('rejects invalid ports and public URLs', () => {
    expect(() => resolveStartOptions({ port: 'invalid' })).toThrow('Invalid port');
    expect(() => resolveStartOptions({ port: 0 })).toThrow('Invalid port');
    expect(() => normalizePublicUrl('ftp://example.com')).toThrow('Invalid public URL');
  });

  it('preserves a base path in public URLs', () => {
    expect(normalizePublicUrl('http://chattransfer.example/chat/')).toBe(
      'http://chattransfer.example/chat'
    );
  });

  it('uses a user data directory for npm runtime', () => {
    vi.stubEnv('CHATTRANSFER_RUNTIME', 'npm');
    vi.stubEnv('CHATTRANSFER_DATA_DIR', '/tmp/chattransfer-user-data');

    expect(getDefaultDataDir()).toBe('/tmp/chattransfer-user-data');
    expect(getDatabaseFile()).toBe('/tmp/chattransfer-user-data/chattransfer.db');

    vi.unstubAllEnvs();
  });

  it('supports an explicit config file for tests and deployments', () => {
    vi.stubEnv('CHATTRANSFER_CONFIG_FILE', '/tmp/chattransfer-config.json');

    expect(getConfigFile()).toBe('/tmp/chattransfer-config.json');
    expect(getCachePath()).toBe('/tmp/uploads');

    vi.unstubAllEnvs();
  });

  it('disables browser opening in headless Linux environments', () => {
    vi.stubEnv('CHATTRANSFER_NO_BROWSER', '1');
    expect(shouldOpenBrowser({ env: {}, platform: 'linux' })).toBe(false);

    vi.unstubAllEnvs();
    vi.stubEnv('DISPLAY', '');
    vi.stubEnv('WAYLAND_DISPLAY', '');
    expect(shouldOpenBrowser({ env: {}, platform: 'linux' })).toBe(false);

    vi.unstubAllEnvs();
  });

  it('uses the configured public URL for generated links', async () => {
    vi.stubEnv('CHATTRANSFER_PUBLIC_URL', 'http://chattransfer.example');
    const serverModule = await import('../server/index');
    const app = serverModule.createApp();

    const response = await request(app).get('/scanLogin?sender=A&receiver=group_chat');

    expect(response.body.data.targetUrl).toBe(
      'http://chattransfer.example/chat?sender=A&receiver=group_chat'
    );

    vi.unstubAllEnvs();
  });

  it('configures an installable npm package', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const bin = readFileSync('bin/chattransfer.js', 'utf8');

    expect(pkg.bin.chattransfer).toBe('bin/chattransfer.js');
    expect(bin.startsWith('#!/usr/bin/env node')).toBe(true);
    expect(pkg.engines.node).toBe('>=20.17.0');
    expect(pkg.files).toEqual(expect.arrayContaining([
      'bin',
      'server',
      'frontend/dist/**/*',
      'README.md',
      'LICENSE'
    ]));
    expect(pkg.files).not.toContain('tests');
    expect(pkg.files).not.toContain('docs');
    expect(pkg.scripts.prepublishOnly).toContain('npm test');
    expect(pkg.scripts.prepublishOnly).toContain('build:frontend');
  });
});
