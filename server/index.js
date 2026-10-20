const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { getIPAddress, openDefaultBrowser } = require('./tool');
const { getCachePath, getConfigFile, getDefaultCachePath } = require('./config');
const registerRoutes = require('./routes/index');
const registerSocket = require('./socket/index');
const { MessageHistoryService } = require('./services/message-history-service');
const { trackEvent } = require('./telemetry/compat');
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

function createConfiguredApp(cachePath) {
  const app = createApp();
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

  registerRoutes(app, safeCachePath.path);
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

  try {
    await historyService.init();
  } catch (error) {
    console.error('[History] initialization failed:', error.message);
    return;
  }

  const app = createConfiguredApp(uploadsDir);
  const server = http.createServer(app);

  registerSocket(server, historyService);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, runtimeOptions.host, resolve);
  });

  const homeUrl = runtimeOptions.publicUrl || `http://${clientIpAddress}:${port}`;

  console.log(`ChatTransfer v${pkg.version}`);
  console.log(`Server: ${homeUrl}`);
  console.log(`Listen: ${runtimeOptions.host}:${port}`);
  console.log(`CacheDir: ${uploadsDir}`);
  console.log(`Runtime: ${getRuntimeName()}`);
  console.log(`DataDir: ${path.dirname(getConfigFile())}`);

  trackEvent('app_start', {
    local_url: homeUrl,
    port
  });

  if (runtimeOptions.openBrowser) {
    openDefaultBrowser(homeUrl, (error) => {
      if (error) {
        console.error(`Failed to open browser: ${error.message}`);
      }
    });
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
