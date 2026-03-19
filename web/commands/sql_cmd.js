'use strict';
const path = require('path');
const { getDefaultDbPath } = require('../lib/paths');
const { openDb } = require('../lib/database');

const ALLOWED_TABLES = new Set(['plays', 'tracks', 'albums', 'artists', 'tracks_fts']);

function queryCmd(sql, { database, format = 'table' } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath, { readonly: true });
  let rows;
  try {
    rows = db.prepare(sql).all();
  } catch (e) {
    console.error(`SQL error: ${e.message}`);
    db.close();
    process.exit(1);
  }
  db.close();

  if (format === 'json') { console.log(JSON.stringify(rows, null, 2)); return; }
  if (rows.length === 0) { console.log('(no rows)'); return; }

  const cols = Object.keys(rows[0]);
  const widths = cols.map(c => Math.min(40, Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length))));
  console.log(padRow(cols, widths));
  console.log('─'.repeat(widths.reduce((a, b) => a + b + 2, -2)));
  for (const r of rows) console.log(padRow(cols.map(c => r[c]), widths));
  console.log(`\n(${rows.length} rows)`);
}

function tablesCmd({ database } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath, { readonly: true });
  const tables = db.prepare("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name").all();
  db.close();
  console.log('\nTables:\n');
  for (const t of tables) console.log(`  ${t.name}`);
  console.log('');
}

function schemaCmd(table, { database } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath, { readonly: true });
  if (table) {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE name = ?").get(table);
    db.close();
    console.log(row?.sql || `(no schema for ${table})`);
  } else {
    const rows = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name").all();
    db.close();
    for (const r of rows) if (r.sql) console.log(r.sql + ';\n');
  }
}

function rowsCmd(table, { database, limit = 20 } = {}) {
  if (!ALLOWED_TABLES.has(table)) {
    console.error(`Unknown table: ${table}. Allowed: ${[...ALLOWED_TABLES].join(', ')}`);
    process.exit(1);
  }
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath, { readonly: true });
  const rows = db.prepare(`SELECT * FROM [${table}] LIMIT ?`).all(limit);
  db.close();

  if (rows.length === 0) { console.log('(no rows)'); return; }
  const cols = Object.keys(rows[0]);
  const widths = cols.map(c => Math.min(40, Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length))));
  console.log(padRow(cols, widths));
  console.log('─'.repeat(widths.reduce((a, b) => a + b + 2, -2)));
  for (const r of rows) console.log(padRow(cols.map(c => r[c]), widths));
  console.log(`\n(${rows.length} rows)`);
}

function padRow(cols, widths) {
  return cols.map((c, i) => String(c ?? '').substring(0, widths[i]).padEnd(widths[i])).join('  ');
}

module.exports = { queryCmd, tablesCmd, schemaCmd, rowsCmd };
