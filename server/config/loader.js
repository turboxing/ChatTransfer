const fs = require('fs');
const path = require('path');
const { getTelemetryConfigFile } = require('../utils/runtime-paths');

const DEFAULT_CONFIG = {
  analytics: {
    enabled: false,
    apiKey: ''
  }
};

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error(`[Config] load failed (${filePath}):`, error.message);
    return null;
  }
}

function loadConfig() {
  const builtinPath = path.resolve(__dirname, '../../config/default-analytics.json');
  const defaultPath = path.resolve(__dirname, '../../config/default.json');
  const defaults = readJsonFile(defaultPath) || {};
  const builtin = readJsonFile(builtinPath) || {};
  const local = readJsonFile(getTelemetryConfigFile()) || {};

  return {
    ...DEFAULT_CONFIG,
    ...defaults,
    ...builtin,
    ...local,
    analytics: {
      ...DEFAULT_CONFIG.analytics,
      ...(defaults.analytics || {}),
      ...(builtin.analytics || {}),
      ...(local.analytics || {})
    }
  };
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig
};
