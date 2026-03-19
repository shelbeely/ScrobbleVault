'use strict';
const path = require('path');
const { getDefaultDbPath } = require('../lib/paths');
const { openDb } = require('../lib/database');
const { getRecentPlays } = require('../lib/queries');

function recentCmd({ database, limit = 20, format = 'table', offset = 0 } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath, { readonly: true });
  const rows = getRecentPlays(db, { limit, offset });
  db.close();
  if (format === 'json') { console.log(JSON.stringify(rows, null, 2)); return; }
  console.log(`\nRecent ${limit} Plays\n`);
  console.log(padRow(['Date', 'Track', 'Artist'], [24, 40, 30]));
  console.log('─'.repeat(96));
  for (const r of rows) {
    const d = r.timestamp ? new Date(r.timestamp * 1000).toLocaleString() : '—';
    console.log(padRow([d, r.title, r.artist_name], [24, 40, 30]));
  }
  console.log('');
}

function padRow(cols, widths) {
  return cols.map((c, i) => String(c ?? '').substring(0, widths[i]).padEnd(widths[i])).join('  ');
}

module.exports = { recentCmd };
