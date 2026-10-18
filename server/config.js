const fs = require('fs');
const path = require('path');
const {
  getConfigFile,
  getDefaultDataDir
} = require('./utils/runtime-paths');

const DEFAULT_CONFIG = { cachePath: null };

function loadConfig(configFile = getConfigFile()) {
  try {
    if (fs.existsSync(configFile)) {
      const raw = fs.readFileSync(configFile, 'utf8');
      const parsed = raw ? JSON.parse(raw) : {};
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('[Config] load failed:', e.message);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg, configFile = getConfigFile()) {
  const tmp = `${configFile}.tmp`;

  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmp, configFile);
}

function getDefaultCachePath() {
  return path.join(getDefaultDataDir(), 'uploads');
}

function getCachePath() {
  const cfg = loadConfig();
  if (cfg.cachePath && fs.existsSync(cfg.cachePath)) {
    return cfg.cachePath;
  }
  return getDefaultCachePath();
}

function isCustomized() {
  const cfg = loadConfig();
  return !!(cfg.cachePath && cfg.cachePath !== getDefaultCachePath());
}

function setCachePath(p) {
  const cfg = loadConfig();
  cfg.cachePath = p;
  saveConfig(cfg);
}

module.exports = {
  getConfigFile,
  loadConfig,
  saveConfig,
  getCachePath,
  setCachePath,
  getDefaultCachePath,
  isCustomized,
  DEFAULT_CONFIG
};
