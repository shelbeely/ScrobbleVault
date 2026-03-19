'use strict';
const path = require('path');
const { getDefaultDbPath } = require('../lib/paths');
const { openDb } = require('../lib/database');
const { getTopArtists } = require('../lib/queries');

function topCmd({ database, limit = 20, format = 'table', offset = 0 } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath, { readonly: true });
  const rows = getTopArtists(db, { limit, offset });
  db.close();
  if (format === 'json') { console.log(JSON.stringify(rows, null, 2)); return; }
  console.log(`\nTop ${limit} Artists\n`);
  console.log(padRow(['#', 'Artist', 'Plays'], [5, 50, 10]));
  console.log('─'.repeat(67));
  rows.forEach((r, i) => console.log(padRow([offset + i + 1, r.name, r.play_count], [5, 50, 10])));
  console.log('');
}

function padRow(cols, widths) {
  return cols.map((c, i) => String(c ?? '').substring(0, widths[i]).padEnd(widths[i])).join('  ');
}

module.exports = { topCmd };
