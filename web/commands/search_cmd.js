'use strict';
const path = require('path');
const { getDefaultDbPath } = require('../lib/paths');
const { openDb } = require('../lib/database');
const { search } = require('../lib/queries');

function run(query, { database, limit = 20, format = 'table' } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath, { readonly: true });
  const results = search(db, query, { limit });
  db.close();

  if (format === 'json') {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log(`No results for "${query}"`);
    return;
  }

  console.log(`\nSearch results for "${query}" (${results.length} found):\n`);
  console.log(padRow(['Track', 'Artist', 'Album'], [40, 30, 30]));
  console.log('─'.repeat(102));
  for (const r of results) {
    console.log(padRow([r.title, r.artist_name, r.album_title], [40, 30, 30]));
  }
  console.log('');
}

function padRow(cols, widths) {
  return cols.map((c, i) => String(c || '').substring(0, widths[i]).padEnd(widths[i])).join('  ');
}

module.exports = { run };
