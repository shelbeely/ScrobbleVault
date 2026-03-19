'use strict';
const path = require('path');
const { getDefaultDbPath } = require('../lib/paths');
const { openDb } = require('../lib/database');
const { getStats, getMonthlyRollup, getYearlyRollup } = require('../lib/queries');

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function overviewCmd({ database, format = 'table' } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath, { readonly: true });
  const stats = getStats(db);
  db.close();

  if (format === 'json') { console.log(JSON.stringify(stats, null, 2)); return; }

  console.log('\n📊 scrobbledb overview\n');
  console.log(`Total scrobbles : ${(stats.total_scrobbles || 0).toLocaleString()}`);
  console.log(`Unique artists  : ${(stats.unique_artists || 0).toLocaleString()}`);
  console.log(`Unique albums   : ${(stats.unique_albums || 0).toLocaleString()}`);
  console.log(`Unique tracks   : ${(stats.unique_tracks || 0).toLocaleString()}`);
  console.log(`First scrobble  : ${fmtDate(stats.first_scrobble)}`);
  console.log(`Last scrobble   : ${fmtDate(stats.last_scrobble)}`);
  console.log('');
}

function monthlyCmd({ database, format = 'table', limit, since, until } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath, { readonly: true });
  const rows = getMonthlyRollup(db, { limit, since, until });
  db.close();

  if (format === 'json') { console.log(JSON.stringify(rows, null, 2)); return; }

  console.log('\nMonthly Scrobbles\n');
  console.log(padRow(['Year', 'Month', 'Scrobbles', 'Artists', 'Albums', 'Tracks'], [6, 8, 12, 10, 10, 10]));
  console.log('─'.repeat(58));
  for (const r of rows) {
    console.log(padRow([r.year, String(r.month).padStart(2, '0'), r.scrobbles, r.unique_artists, r.unique_albums, r.unique_tracks], [6, 8, 12, 10, 10, 10]));
  }
  console.log('');
}

function yearlyCmd({ database, format = 'table', limit, since, until } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath, { readonly: true });
  const rows = getYearlyRollup(db, { limit, since, until });
  db.close();

  if (format === 'json') { console.log(JSON.stringify(rows, null, 2)); return; }

  console.log('\nYearly Scrobbles\n');
  console.log(padRow(['Year', 'Scrobbles', 'Artists', 'Albums', 'Tracks'], [6, 12, 10, 10, 10]));
  console.log('─'.repeat(50));
  for (const r of rows) {
    console.log(padRow([r.year, r.scrobbles, r.unique_artists, r.unique_albums, r.unique_tracks], [6, 12, 10, 10, 10]));
  }
  console.log('');
}

function padRow(cols, widths) {
  return cols.map((c, i) => String(c ?? '').substring(0, widths[i]).padEnd(widths[i])).join('  ');
}

module.exports = { overviewCmd, monthlyCmd, yearlyCmd };
