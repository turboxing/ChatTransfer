const os = require('os');
const path = require('path');

const RUNTIMES = new Set(['development', 'npm', 'pkg', 'docker']);

function getRuntimeName() {
  const runtime = process.env.CHATTRANSFER_RUNTIME;

  if (runtime && RUNTIMES.has(runtime)) {
    return runtime;
  }

  return process.pkg ? 'pkg' : 'development';
}

function getUserDataDir() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'ChatTransfer');
  }

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'ChatTransfer');
  }

  const xdgDataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(xdgDataHome, 'ChatTransfer');
}

function getDefaultDataDir() {
  const explicitDataDir = process.env.CHATTRANSFER_DATA_DIR;

  if (explicitDataDir) {
    return path.resolve(explicitDataDir);
  }

  if (process.env.CHATTRANSFER_CONFIG_FILE) {
    return path.dirname(path.resolve(process.env.CHATTRANSFER_CONFIG_FILE));
  }

  const runtime = getRuntimeName();

  if (runtime === 'pkg') {
    return path.dirname(process.execPath);
  }

  if (runtime === 'npm' || runtime === 'docker') {
    return getUserDataDir();
  }

  return path.join(__dirname, '..', '..');
}

function getConfigFile() {
  return process.env.CHATTRANSFER_CONFIG_FILE
    ? path.resolve(process.env.CHATTRANSFER_CONFIG_FILE)
    : path.join(getDefaultDataDir(), 'config.json');
}

function getTelemetryConfigFile() {
  return path.join(getDefaultDataDir(), 'config', 'local.json');
}

function getDatabaseFile() {
  const runtime = getRuntimeName();

  if (runtime === 'npm' || runtime === 'docker') {
    return path.join(getDefaultDataDir(), 'chattransfer.db');
  }

  return path.join(getDefaultDataDir(), 'uploads', 'history', 'chattransfer.db');
}

function usesIndependentDatabaseFile() {
  const runtime = getRuntimeName();
  return runtime === 'npm' || runtime === 'docker';
}

module.exports = {
  getConfigFile,
  getDatabaseFile,
  getDefaultDataDir,
  getRuntimeName,
  getTelemetryConfigFile,
  getUserDataDir,
  usesIndependentDatabaseFile
};
