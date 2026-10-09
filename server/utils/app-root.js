const path = require('path');

function getAppWritableRoot() {
  return process.pkg
    ? path.dirname(process.execPath)
    : path.join(__dirname, '..', '..');
}

module.exports = {
  getAppWritableRoot
};
