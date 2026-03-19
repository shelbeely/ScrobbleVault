'use strict';
const readline = require('readline');
const { saveAuth } = require('../lib/config');
const { ensureDataDir, getDefaultAuthPath } = require('../lib/paths');

async function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function run({ auth: authPath, network = 'lastfm' } = {}) {
  ensureDataDir();
  const outPath = authPath || getDefaultAuthPath();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\nConfigure Last.fm API credentials');
  console.log('Get your API key at: https://www.last.fm/api/account/create\n');

  const username = await prompt(rl, 'Last.fm username: ');
  const apiKey = await prompt(rl, 'API key: ');
  const sharedSecret = await prompt(rl, 'Shared secret: ');
  const sessionKey = await prompt(rl, 'Session key (optional, press Enter to skip): ');

  rl.close();

  const data = {
    lastfm_network: network,
    lastfm_username: username.trim(),
    lastfm_api_key: apiKey.trim(),
    lastfm_shared_secret: sharedSecret.trim(),
    ...(sessionKey.trim() ? { lastfm_session_key: sessionKey.trim() } : {}),
  };

  saveAuth(data, outPath);
  console.log(`\n✓ Credentials saved to ${outPath}`);
}

module.exports = { run };
