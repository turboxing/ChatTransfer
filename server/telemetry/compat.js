const { getDefaultDataDir, getRuntimeName } = require('../utils/runtime-paths');
const pkg = require('../../package.json');
const { TelemetryService } = require('./service');

let service = new TelemetryService({
  dataDir: getDefaultDataDir(),
  version: pkg.version,
  runtime: getRuntimeName(),
  os: process.platform,
  arch: process.arch
});
let configured = false;

function configureTelemetry(options = {}) {
  service.configure({
    dataDir: options.dataDir || getDefaultDataDir(),
    version: options.version || pkg.version,
    runtime: options.runtime || getRuntimeName(),
    os: options.os || process.platform,
    arch: options.arch || process.arch,
    disabled: options.disabled
  });
  configured = true;
  return service;
}

function normalizeContext(context) {
  if (typeof context === 'string') return { userId: context };
  return context && typeof context === 'object' ? context : {};
}

function trackEvent(eventType, eventProperties = {}, context = null) {
  if (!configured) return Promise.resolve(false);
  return service.track(eventType, eventProperties, normalizeContext(context));
}

function trackUserActive(userId, eventProperties = {}) {
  if (!configured) return Promise.resolve(false);
  return service.trackUserActive(userId, eventProperties);
}

function trackMessageSent(payload) {
  if (!configured) return Promise.resolve(false);
  return service.trackMessageSent(payload);
}

function isTelemetryEnabled() {
  return configured && service.enabled;
}

function shutdownTelemetry() {
  return service.shutdown();
}

module.exports = {
  configureTelemetry,
  isTelemetryEnabled,
  shutdownTelemetry,
  trackEvent,
  trackMessageSent,
  trackUserActive
};
