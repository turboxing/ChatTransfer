const http = require('http');
const net = require('net');
const { getIPAddress, openDefaultBrowser, initCachePath } = require('./tool');
const { getCachePath } = require('./config');
const registerRoutes = require('./routes/index');
const registerSocket = require('./socket/index');
const { trackEvent } = require('./telemetry/compat');

const DEFAULT_PORT = 55555;
const MAX_RETRY = 3;
const clientIpAddress = getIPAddress() || '127.0.0.1';
const pkg = require('../package.json');

function createApp() {
  const app = require('express')();
  registerRoutes(app);
  return app;
}

function canListen(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => resolve(false));
    tester.once('listening', () => tester.close(() => resolve(true)));
    tester.listen(port, '0.0.0.0');
  });
}

async function resolvePort() {
  for (let index = 0; index <= MAX_RETRY; index += 1) {
    const port = DEFAULT_PORT + index;

    if (await canListen(port)) {
      return port;
    }
  }

  return null;
}

async function start() {
  const app = createApp();
  const port = await resolvePort();

  if (!port) {
    console.error(`Ports ${DEFAULT_PORT}-${DEFAULT_PORT + MAX_RETRY} are in use`);
    return;
  }

  const server = http.createServer(app);
  const uploadsDir = getCachePath();

  registerSocket(server);

  server.listen(port, () => {
    const homeUrl = `http://${clientIpAddress}:${port}`;

    console.log(`ChatTransfer v${pkg.version}`);
    console.log(`Server: ${homeUrl}`);
    console.log(`CacheDir: ${uploadsDir}`);
    console.log(`Runtime: ${process.pkg ? 'packaged' : 'development'}`);

    trackEvent('app_start', {
      local_url: homeUrl,
      port
    });

    initCachePath(uploadsDir, (error) => {
      if (!error) {
        openDefaultBrowser(homeUrl);
      }
    });
  });
}

if (require.main === module) {
  start();
}

module.exports = {
  createApp,
  start
};
