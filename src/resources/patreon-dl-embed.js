#!/usr/bin/env node

const parseArgs = require('yargs-parser');
const SproutVideoDownloader = require('./SproutVideoDownloader');
const VimeoDownloader = require('./VimeoDownloader');

const args = parseArgs(process.argv.slice(2));
const provider = args['provider'];
if (!provider) {
  throw Error('No provider specified');
}

let downloader = null;
switch (provider) {
  case 'vimeo':
    downloader = new VimeoDownloader();
    break;
  case 'sproutvideo':
    downloader = new SproutVideoDownloader;
    break;
  default:
    throw Error(`Unknown provider "${provider}"`);
}

(async () => {
  try {
    process.exit(await downloader.start());
  }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();