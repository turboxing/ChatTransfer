const { parseArgs } = require('node:util');

const CLI_OPTIONS = {
  host: { type: 'string' },
  port: { type: 'string' },
  'data-dir': { type: 'string' },
  'public-url': { type: 'string' },
  'no-browser': { type: 'boolean', default: false },
  version: { type: 'boolean', default: false },
  help: { type: 'boolean', default: false }
};

function parseCliArguments(argv = process.argv.slice(2)) {
  try {
    const { values } = parseArgs({
      args: argv,
      options: CLI_OPTIONS,
      strict: true,
      allowPositionals: false
    });

    return values;
  } catch (error) {
    throw new Error(error.message);
  }
}

function toStartOptions(cliValues, env = process.env) {
  const { resolveStartOptions } = require('./utils/runtime-options');

  return resolveStartOptions({
    host: cliValues.host,
    port: cliValues.port,
    dataDir: cliValues['data-dir'],
    publicUrl: cliValues['public-url'],
    openBrowser: cliValues['no-browser'] ? false : undefined
  }, env);
}

function getHelpText() {
  return [
    'ChatTransfer - LAN instant messaging and file transfer',
    '',
    'Usage:',
    '  chattransfer [options]',
    '',
    'Options:',
    '  --host <host>              Listen host (default: 0.0.0.0)',
    '  --port <port>              Listen port (default: 55555)',
    '  --data-dir <path>          Runtime data directory',
    '  --public-url <url>         Public URL used by QR codes and links',
    '  --no-browser               Do not open the local browser',
    '  --version                  Print the version',
    '  --help                     Print this help',
    '',
    'Environment variables:',
    '  CHATTRANSFER_HOST',
    '  CHATTRANSFER_PORT',
    '  CHATTRANSFER_DATA_DIR',
    '  CHATTRANSFER_PUBLIC_URL',
    '  CHATTRANSFER_NO_BROWSER'
  ].join('\n');
}

module.exports = {
  getHelpText,
  parseCliArguments,
  toStartOptions
};
