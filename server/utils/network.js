const os = require('os');

function isLoopbackAddress(address) {
  if (!address) return false;

  const normalized = String(address).replace(/^::ffff:/, '').trim().toLowerCase();
  return normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized === 'localhost';
}

function getIPAddress() {
  const interfaces = os.networkInterfaces();

  for (const interfaceName of Object.keys(interfaces)) {
    const addresses = interfaces[interfaceName] || [];

    for (const address of addresses) {
      if (address.family === 'IPv4' && address.address !== '127.0.0.1' && !address.internal) {
        return address.address;
      }
    }
  }

  return undefined;
}

module.exports = {
  getIPAddress,
  isLoopbackAddress
};
