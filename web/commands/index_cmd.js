'use strict';
const path = require('path');
const { getDefaultDbPath } = require('../lib/paths');
const { openDb, rebuildFts5 } = require('../lib/database');

function run({ database } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath);
  console.log('Building FTS5 search index...');
  rebuildFts5(db);
  db.close();
  console.log('✓ Search index rebuilt');
}

module.exports = { run };
