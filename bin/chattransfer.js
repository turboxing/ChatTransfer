#!/usr/bin/env node

process.env.CHATTRANSFER_RUNTIME = process.env.CHATTRANSFER_RUNTIME || 'npm';

const { getHelpText, parseCliArguments, toStartOptions } = require('../server/cli-options');
const { start } = require('../server/index');
const pkg = require('../package.json');

async function main() {
  const cliValues = parseCliArguments();

  if (cliValues.help) {
    console.log(getHelpText());
    return;
  }

  if (cliValues.version) {
    console.log(pkg.version);
    return;
  }

  const options = toStartOptions(cliValues);

  if (options.dataDir) {
    process.env.CHATTRANSFER_DATA_DIR = options.dataDir;
  }

  if (options.publicUrl) {
    process.env.CHATTRANSFER_PUBLIC_URL = options.publicUrl;
  }

  const server = await start(options);
  if (!server) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`ChatTransfer: ${error.message}`);
  process.exitCode = 1;
});
