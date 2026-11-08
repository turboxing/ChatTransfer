class NoopProvider {
  async track() {
    return Promise.resolve();
  }

  async trackBatch() {
    return Promise.resolve();
  }
}

module.exports = NoopProvider;
