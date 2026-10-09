class NoopProvider {
  async track() {
    return Promise.resolve();
  }
}

module.exports = NoopProvider;
