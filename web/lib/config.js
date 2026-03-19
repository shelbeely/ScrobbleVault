'use strict';
const fs = require('fs');
const { getDefaultAuthPath } = require('./paths');

function loadAuth(authPath) {
  const p = authPath || getDefaultAuthPath();
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function saveAuth(data, authPath) {
  const p = authPath || getDefaultAuthPath();
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { loadAuth, saveAuth };
