const fs = require('fs');
const path = require('path');
const { getAppWritableRoot } = require('./tool.js');

const CONFIG_FILE = path.join(getAppWritableRoot(), 'config.json');
const DEFAULT_CONFIG = { cachePath: null };

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = raw ? JSON.parse(raw) : {};
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('[Config] load failed:', e.message);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg) {
  const tmp = CONFIG_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmp, CONFIG_FILE);
}

function getDefaultCachePath() {
  return path.join(getAppWritableRoot(), 'uploads');
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
  loadConfig,
  saveConfig,
  getCachePath,
  setCachePath,
  getDefaultCachePath,
  isCustomized,
  CONFIG_FILE,
  DEFAULT_CONFIG
};
