const fs = require('fs');
const { execFile } = require('child_process');

function isExplorerSuccess(error, directory, existsSync = fs.existsSync) {
  return Boolean(error && error.code === 1 && existsSync(directory));
}

function openDirectory(directory, options = {}) {
  const platform = options.platform || process.platform;
  const execFileImpl = options.execFileImpl || execFile;
  const existsSync = options.existsSync || fs.existsSync;

  return new Promise((resolve, reject) => {
    if (platform === 'win32') {
      execFileImpl('explorer', [directory], (error) => {
        if (!error || isExplorerSuccess(error, directory, existsSync)) {
          resolve();
          return;
        }

        reject(error);
      });
      return;
    }

    const command = platform === 'darwin' ? 'open' : 'xdg-open';
    execFileImpl(command, [directory], (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

module.exports = {
  isExplorerSuccess,
  openDirectory
};
