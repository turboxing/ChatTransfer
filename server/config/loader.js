const fs = require('fs');
const { getTelemetryConfigFile } = require('../utils/runtime-paths');

const DEFAULT_CONFIG = {
  analytics: {
    enabled: false,
    apiKey: ''
  }
};

function loadConfig() {
  const configPath = getTelemetryConfigFile();

  try {
    if (!fs.existsSync(configPath)) {
      return { ...DEFAULT_CONFIG };
    }

    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      analytics: {
        ...DEFAULT_CONFIG.analytics,
        ...(parsed.analytics || {})
      }
    };
  } catch (error) {
    console.error('[Config] load failed:', error.message);
    return { ...DEFAULT_CONFIG };
  }
}

module.exports = {
  loadConfig
};
