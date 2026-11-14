const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { getIPAddress, openDefaultBrowser } = require('./tool');
const { getCachePath, getConfigFile, getDefaultCachePath } = require('./config');
const registerRoutes = require('./routes/index');
const registerSocket = require('./socket/index');
const { MessageHistoryService } = require('./services/message-history-service');
const { BatchDownloadService } = require('./services/batch-download-service');
const {
  configureTelemetry,
  isTelemetryEnabled,
  shutdownTelemetry,
  trackEvent
} = require('./telemetry/compat');
const {
  getDatabaseFile,
  getRuntimeName,
  usesIndependentDatabaseFile
} = require('./utils/runtime-paths');
const { resolveStartOptions } = require('./utils/runtime-options');
const { getSafeStartupCachePath } = require('./utils/cache-path-validation');

const DEFAULT_PORT = 55556;
const MAX_RETRY = 3;
const clientIpAddress = getIPAddress() || '127.0.0.1';
const pkg = require('../package.json');

function createApp() {
  const app = require('express')();
  return app;
}

function createConfiguredApp(
  cachePath,
  historyService = null,
  batchDownloadService = null,
  appOptions = {}
) {
  const app = createApp();
  const resolvedOptions = resolveStartOptions();
  app.locals.publicRoomRetentionDays = Number.isFinite(Number(appOptions.publicRoomRetentionDays))
    ? Number(appOptions.publicRoomRetentionDays)
    : resolvedOptions.publicRoomRetentionDays;
  const safeCachePath = cachePath
    ? { path: path.resolve(cachePath), changed: false }
    : getSafeStartupCachePath({
      appRoot: path.resolve(__dirname, '..'),
      configPath: getConfigFile(),
      configuredPath: getCachePath(),
      dataRoot: path.dirname(getConfigFile()),
      defaultPath: getDefaultCachePath()
    });

  if (safeCachePath.changed) {
    console.warn(`[Cache] unsafe configured path rejected: ${getCachePath()}`);
    console.warn(`[Cache] fallback to default: ${safeCachePath.path}`);
  }

  registerRoutes(app, safeCachePath.path, historyService, batchDownloadService);
  return app;
}

function canListen(port, host) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => resolve(false));
    tester.once('listening', () => tester.close(() => resolve(true)));
    tester.listen(port, host);
  });
}

async function resolvePort({ host, port, explicitPort }) {
  if (explicitPort) {
    return await canListen(port, host) ? port : null;
  }

  for (let index = 0; index <= MAX_RETRY; index += 1) {
    const candidatePort = DEFAULT_PORT + index;

    if (await canListen(candidatePort, host)) {
      return candidatePort;
    }
  }

  return null;
}

async function start(options = {}) {
  const runtimeOptions = resolveStartOptions(options);

  if (runtimeOptions.dataDir) {
    process.env.CHATTRANSFER_DATA_DIR = runtimeOptions.dataDir;
  }

  if (runtimeOptions.publicUrl) {
    process.env.CHATTRANSFER_PUBLIC_URL = runtimeOptions.publicUrl;
  }

  const port = await resolvePort(runtimeOptions);

  if (!port) {
    console.error(runtimeOptions.explicitPort
      ? `Port ${runtimeOptions.port} is in use`
      : `Ports ${DEFAULT_PORT}-${DEFAULT_PORT + MAX_RETRY} are in use`);
    return;
  }

  const configuredCachePath = getCachePath();
  const defaultCachePath = getDefaultCachePath();
  const safeCachePath = getSafeStartupCachePath({
    appRoot: path.resolve(__dirname, '..'),
    configPath: getConfigFile(),
    configuredPath: configuredCachePath,
    dataRoot: path.dirname(getConfigFile()),
    defaultPath: defaultCachePath
  });

  if (safeCachePath.changed) {
    console.warn(`[Cache] unsafe configured path rejected: ${configuredCachePath}`);
    console.warn(`[Cache] fallback to default: ${safeCachePath.path}`);
  }

  const uploadsDir = safeCachePath.path;
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  const historyService = new MessageHistoryService({
    cachePath: uploadsDir,
    databasePath: usesIndependentDatabaseFile() ? getDatabaseFile() : undefined
  });
  const batchDownloadService = new BatchDownloadService({ historyService });

  try {
    await historyService.init();
  } catch (error) {
    console.error('[History] initialization failed:', error.message);
    return;
  }

  configureTelemetry({
    dataDir: path.dirname(getConfigFile()),
    disabled: runtimeOptions.telemetryDisabled,
    version: pkg.version,
    runtime: getRuntimeName(),
    os: process.platform,
    arch: process.arch
  });

  historyService.configureIdleRetention(runtimeOptions.roomIdleRetentionDays);
  const publicRoomRetentionDays = runtimeOptions.publicRoomRetentionDays;
  if (Number.isFinite(publicRoomRetentionDays) && publicRoomRetentionDays > 0) {
    historyService.startPublicRoomCleanup({ retentionDays: publicRoomRetentionDays });
  }

  const app = createConfiguredApp(uploadsDir, historyService, batchDownloadService, {
    publicRoomRetentionDays
  });
  const server = http.createServer(app);

  const io = registerSocket(server, historyService, batchDownloadService, {
    roomIdleRetentionDays: runtimeOptions.roomIdleRetentionDays
  });
  await io.idleCleanupReady;

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, runtimeOptions.host, resolve);
  });

  server.once('close', () => {
    historyService.stopPublicRoomCleanup();
    void shutdownTelemetry();
  });

  const homeUrl = runtimeOptions.publicUrl || `http://${clientIpAddress}:${port}`;
  const idleRoomRetention = runtimeOptions.roomIdleRetentionDays > 0
    ? `${runtimeOptions.roomIdleRetentionDays}d`
    : 'disabled';
  const publicMessageRetention = runtimeOptions.publicRoomRetentionDays > 0
    ? `${runtimeOptions.publicRoomRetentionDays}d`
    : 'disabled';

  console.log(`ChatTransfer v${pkg.version}`);
  console.log(`Runtime: ${getRuntimeName()}`);
  console.log(`Listen: ${runtimeOptions.host}:${port}`);
  console.log(`Server: ${homeUrl}`);
  console.log(`DataDir: ${path.dirname(getConfigFile())}`);
  console.log(`CacheDir: ${uploadsDir}`);
  console.log(`Retention: idle-room=${idleRoomRetention} public-messages=${publicMessageRetention}`);
  if (!isTelemetryEnabled()) {
    console.log('Telemetry: disabled');
  }

  trackEvent('app_start', { port });

  if (runtimeOptions.openBrowser) {
    console.log(`Opening browser: ${homeUrl}`);
    openDefaultBrowser(homeUrl, (error) => {
      if (error) {
        console.error(`Failed to open browser: ${error.message}`);
      }
    });
  } else {
    console.log('Browser launch: disabled');
  }

  return server;
}

if (require.main === module) {
  start();
}

module.exports = {
  createApp: createConfiguredApp,
  start
};
