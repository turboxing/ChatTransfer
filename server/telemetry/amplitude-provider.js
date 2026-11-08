const axios = require('axios');

class AmplitudeProvider {
  constructor({ apiKey, endpoint }) {
    this.apiKey = apiKey;
    this.endpoint = endpoint || 'https://api2.amplitude.com/2/httpapi';
  }

  async track(event) {
    return this.trackBatch([event]);
  }

  async trackBatch(events) {
    await axios.post(this.endpoint, {
      api_key: this.apiKey,
      events
    });
  }
}

module.exports = AmplitudeProvider;
