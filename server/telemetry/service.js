const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createTelemetryProvider } = require('./index');
const { loadConfig } = require('../config/loader');
const NoopProvider = require('./noop-provider');

const MAX_QUEUE_SIZE = 1000;
const FLUSH_BATCH_SIZE = 50;
const FLUSH_DELAY_MS = 500;
const RETRY_DELAY_MS = 5000;

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value), {
    encoding: 'utf8',
    mode: 0o600
  });
  fs.renameSync(temporaryPath, filePath);
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function fileCategory(fileName, fileType) {
  if (String(fileType || '').startsWith('image/')) return 'image';
  const extension = path.extname(String(fileName || '')).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.heic'].includes(extension)) {
    return 'image';
  }
  if (['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz'].includes(extension)) {
    return 'archive';
  }
  if (['.txt', '.md', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(extension)) {
    return 'document';
  }
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm', '.mp3', '.wav', '.m4a'].includes(extension)) {
    return 'media';
  }
  return 'other';
}

function sizeBucket(fileSize) {
  const bytes = Number(fileSize) || 0;
  if (bytes <= 0) return 'unknown';
  if (bytes < 1024 * 1024) return '<1MB';
  if (bytes < 10 * 1024 * 1024) return '1-10MB';
  if (bytes < 100 * 1024 * 1024) return '10-100MB';
  return '>=100MB';
}

class TelemetryService {
  constructor({
    dataDir = process.cwd(),
    version = '',
    runtime = '',
    os = process.platform,
    arch = process.arch,
    disabled = false,
    configLoader = loadConfig,
    providerFactory = createTelemetryProvider,
    now = () => Date.now()
  } = {}) {
    this.dataDir = path.resolve(dataDir);
    this.stateDir = path.join(this.dataDir, 'telemetry');
    this.hostFile = path.join(this.stateDir, 'host.json');
    this.queueFile = path.join(this.stateDir, 'queue.json');
    this.version = version;
    this.runtime = runtime;
    this.os = os;
    this.arch = arch;
    this.disabled = disabled;
    this.configLoader = configLoader;
    this.providerFactory = providerFactory;
    this.now = now;
    this.enabled = false;
    this.provider = new NoopProvider();
    this.queue = [];
    this.host = null;
    this.flushTimer = null;
    this.flushing = false;
    this.activeUsers = new Set();
    this.activeDate = '';
  }

  configure(options = {}) {
    if (options.dataDir) {
      this.dataDir = path.resolve(options.dataDir);
      this.stateDir = path.join(this.dataDir, 'telemetry');
      this.hostFile = path.join(this.stateDir, 'host.json');
      this.queueFile = path.join(this.stateDir, 'queue.json');
    }
    if (typeof options.disabled === 'boolean') this.disabled = options.disabled;
    if (options.version !== undefined) this.version = options.version;
    if (options.runtime !== undefined) this.runtime = options.runtime;
    if (options.os !== undefined) this.os = options.os;
    if (options.arch !== undefined) this.arch = options.arch;

    this.ensureHost();
    this.loadQueue();

    const config = this.configLoader();
    const analytics = config.analytics || {};
    this.enabled = !this.disabled && Boolean(analytics.enabled && analytics.apiKey);
    this.provider = this.enabled
      ? this.providerFactory(config)
      : new NoopProvider();

    if (this.enabled) {
      this.queueInstallIfNeeded();
      this.scheduleFlush(FLUSH_DELAY_MS);
    }

    return this;
  }

  ensureHost() {
    const savedHost = readJson(this.hostFile, null);
    if (savedHost?.id) {
      this.host = savedHost;
      return;
    }

    this.host = {
      id: crypto.randomUUID(),
      createdAt: this.now(),
      installReported: false
    };
    writeJsonAtomic(this.hostFile, this.host);
  }

  loadQueue() {
    const savedQueue = readJson(this.queueFile, []);
    this.queue = Array.isArray(savedQueue)
      ? savedQueue.filter((event) => event && event.event_type)
      : [];
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
    }
  }

  queueInstallIfNeeded() {
    if (this.host.installReported) return;
    if (this.queue.some((event) => event.event_type === 'app_install')) return;

    this.enqueue({
      event_type: 'app_install',
      event_properties: this.baseProperties(),
      device_id: this.host.id,
      time: this.now()
    });
  }

  baseProperties() {
    return {
      host_id: this.host.id,
      app_version: this.version,
      runtime: this.runtime,
      os: this.os,
      arch: this.arch
    };
  }

  hashUser(userId) {
    return crypto
      .createHash('sha256')
      .update(`${this.host.id}:${String(userId)}`)
      .digest('hex')
      .slice(0, 32);
  }

  buildEvent(eventType, eventProperties = {}, context = {}) {
    const event = {
      event_type: eventType,
      event_properties: {
        ...this.baseProperties(),
        ...eventProperties
      },
      device_id: this.host.id,
      time: this.now()
    };

    if (context.userId) {
      event.user_id = this.hashUser(context.userId);
    }

    return event;
  }

  track(eventType, eventProperties = {}, context = {}) {
    if (!this.enabled) return Promise.resolve(false);
    this.enqueue(this.buildEvent(eventType, eventProperties, context));
    this.scheduleFlush(FLUSH_DELAY_MS);
    return Promise.resolve(true);
  }

  trackUserActive(userId, eventProperties = {}) {
    if (!this.enabled || !userId) return Promise.resolve(false);

    const date = new Date(this.now()).toISOString().slice(0, 10);
    if (date !== this.activeDate) {
      this.activeDate = date;
      this.activeUsers.clear();
    }

    const key = `${date}:${userId}`;
    if (this.activeUsers.has(key)) return Promise.resolve(false);
    this.activeUsers.add(key);
    return this.track('user_active', eventProperties, { userId });
  }

  trackMessageSent({
    userId,
    chatType,
    msgType,
    content = '',
    fileName = '',
    fileSize = 0,
    fileType = ''
  }) {
    if (!userId) return Promise.resolve(false);

    const properties = {
      chat_type: chatType,
      msg_type: msgType || 'TEXT',
      has_link: /https?:\/\//i.test(String(content || ''))
    };

    if (['IMAGE', 'FILE'].includes(properties.msg_type)) {
      properties.file_category = fileCategory(fileName, fileType);
      properties.file_size_bucket = sizeBucket(fileSize);
    }

    return this.track('message_sent', properties, { userId });
  }

  enqueue(event) {
    this.queue.push(event);
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
    }
    this.persistQueue();
  }

  scheduleFlush(delay = FLUSH_DELAY_MS) {
    if (!this.enabled || this.flushTimer || this.flushing || this.queue.length === 0) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, delay);
    this.flushTimer.unref?.();
  }

  async flush() {
    if (!this.enabled || this.flushing || this.queue.length === 0) return;

    this.flushing = true;
    const batch = this.queue.slice(0, FLUSH_BATCH_SIZE);
    let failed = false;

    try {
      if (typeof this.provider.trackBatch === 'function') {
        await this.provider.trackBatch(batch);
      } else {
        await Promise.all(batch.map((event) => this.provider.track(event)));
      }

      this.queue.splice(0, batch.length);
      if (batch.some((event) => event.event_type === 'app_install')) {
        this.host.installReported = true;
        writeJsonAtomic(this.hostFile, this.host);
      }
      this.persistQueue();
    } catch (error) {
      failed = true;
      console.error('[Telemetry] send failed:', error.message);
    } finally {
      this.flushing = false;
      if (this.queue.length > 0) {
        this.scheduleFlush(failed ? RETRY_DELAY_MS : FLUSH_DELAY_MS);
      }
    }
  }

  persistQueue() {
    writeJsonAtomic(this.queueFile, this.queue);
  }

  shutdown() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    return this.flush();
  }
}

module.exports = {
  TelemetryService,
  fileCategory,
  sizeBucket
};
