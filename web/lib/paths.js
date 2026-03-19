'use strict';
const os = require('os');
const path = require('path');
const fs = require('fs');

const APP_NAME = 'dev.pirateninja.scrobbledb';

function getDataDir() {
  let base;
  if (process.platform === 'darwin') {
    base = path.join(os.homedir(), 'Library', 'Application Support');
  } else if (process.platform === 'win32') {
    base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  } else {
    base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  }
  return path.join(base, APP_NAME);
}

function ensureDataDir() {
  const dir = getDataDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getDefaultDbPath() {
  return path.join(getDataDir(), 'scrobbledb.db');
}

function getDefaultAuthPath() {
  return path.join(getDataDir(), 'auth.json');
}

module.exports = { APP_NAME, getDataDir, ensureDataDir, getDefaultDbPath, getDefaultAuthPath };
