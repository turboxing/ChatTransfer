const { loadConfig } = require('../config/loader');
const { createTelemetryProvider } = require('./index');

const provider = createTelemetryProvider(loadConfig());

async function trackEvent(eventType, eventProperties = {}, customUserId = null) {
  return provider.track({
    event_type: eventType,
    event_properties: eventProperties,
    user_id: customUserId || undefined,
    time: Date.now()
  });
}

module.exports = {
  trackEvent
};
