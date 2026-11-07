const path = require('path');

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 55556;
const DEFAULT_ROOM_IDLE_RETENTION_DAYS = 7;
const DEFAULT_PUBLIC_ROOM_RETENTION_DAYS = 7;

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parsePort(value, source) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${source}: ${value}`);
  }

  return port;
}

function parseRetentionDays(value, source, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const days = Number(value);
  if (!Number.isInteger(days) || days < 0 || days > 365) {
    throw new Error(`Invalid ${source}: ${value}`);
  }

  return days;
}

function normalizePublicUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Invalid public URL protocol');
    }

    const basePath = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
    return `${url.protocol}//${url.host}${basePath}`;
  } catch (error) {
    throw new Error(`Invalid public URL: ${value}`);
  }
}

function shouldOpenBrowser({ env = process.env, explicitValue, platform = process.platform } = {}) {
  if (typeof explicitValue === 'boolean') {
    return explicitValue;
  }

  if (env.CHATTRANSFER_NO_BROWSER !== undefined) {
    return !isTruthy(env.CHATTRANSFER_NO_BROWSER);
  }

  if (platform === 'linux' && !env.DISPLAY && !env.WAYLAND_DISPLAY) {
    return false;
  }

  return true;
}

function resolveStartOptions(overrides = {}, env = process.env) {
  const portValue = overrides.port ?? env.CHATTRANSFER_PORT;
  const port = portValue === undefined || portValue === null || portValue === ''
    ? DEFAULT_PORT
    : parsePort(portValue, 'port');
  const host = overrides.host ?? env.CHATTRANSFER_HOST ?? DEFAULT_HOST;
  const dataDir = overrides.dataDir ?? env.CHATTRANSFER_DATA_DIR;
  const publicUrl = normalizePublicUrl(overrides.publicUrl ?? env.CHATTRANSFER_PUBLIC_URL);
  const roomIdleRetentionDays = parseRetentionDays(
    overrides.roomIdleRetentionDays ?? env.CHATTRANSFER_ROOM_IDLE_RETENTION_DAYS,
    'room idle retention days',
    DEFAULT_ROOM_IDLE_RETENTION_DAYS
  );
  const publicRoomRetentionDays = parseRetentionDays(
    overrides.publicRoomRetentionDays ?? env.CHATTRANSFER_PUBLIC_ROOM_RETENTION_DAYS,
    'public room retention days',
    DEFAULT_PUBLIC_ROOM_RETENTION_DAYS
  );
  const openBrowser = shouldOpenBrowser({
    env,
    explicitValue: overrides.openBrowser
  });

  if (typeof host !== 'string' || !host.trim()) {
    throw new Error('Invalid host');
  }

  return {
    host: host.trim(),
    port,
    explicitPort: overrides.explicitPort ?? (
      overrides.port !== undefined || env.CHATTRANSFER_PORT !== undefined
    ),
    dataDir: dataDir ? path.resolve(String(dataDir)) : null,
    publicUrl,
    roomIdleRetentionDays,
    publicRoomRetentionDays,
    openBrowser
  };
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_PUBLIC_ROOM_RETENTION_DAYS,
  DEFAULT_ROOM_IDLE_RETENTION_DAYS,
  isTruthy,
  normalizePublicUrl,
  parseRetentionDays,
  parsePort,
  resolveStartOptions,
  shouldOpenBrowser
};
