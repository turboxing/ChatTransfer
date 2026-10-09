const { loadConfig } = require('../config/loader');
const AmplitudeProvider = require('./amplitude-provider');
const NoopProvider = require('./noop-provider');

const providers = {
  amplitude: AmplitudeProvider
};

function createTelemetryProvider(config = loadConfig()) {
  const analytics = config.analytics || {};
  const enabled = analytics.enabled && Boolean(analytics.apiKey);
  const Provider = providers[analytics.provider || 'amplitude'];

  if (!enabled || !Provider) {
    return new NoopProvider();
  }

  return new Provider({
    apiKey: analytics.apiKey,
    endpoint: analytics.endpoint
  });
}

module.exports = {
  createTelemetryProvider
};
