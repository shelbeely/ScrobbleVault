'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Database = require('better-sqlite3');
const { getDataDir, ensureDataDir, getDefaultDbPath, getDefaultAuthPath } = require('../lib/paths');
const { setupSchema, setupFts5, rebuildFts5 } = require('../lib/database');

function initCmd({ noIndex = false, dryRun = false } = {}) {
  const dataDir = getDataDir();
  const dbPath = path.join(dataDir, 'scrobbledb.db');
  const authPath = path.join(dataDir, 'auth.json');

  if (dryRun) {
    console.log('\n[dry-run] Checking initialization state...');
    console.log(`Data dir:  ${dataDir} ${fs.existsSync(dataDir) ? '✓ exists' : '○ not created'}`);
    console.log(`Database:  ${dbPath} ${fs.existsSync(dbPath) ? '✓ exists' : '○ not created'}`);
    console.log(`Auth file: ${authPath} ${fs.existsSync(authPath) ? '✓ exists' : '○ not created'}`);
    return;
  }

  ensureDataDir();
  console.log(`✓ Data directory: ${dataDir}`);

  const db = new Database(dbPath);
  setupSchema(db);
  if (!noIndex) setupFts5(db);
  db.close();

  console.log(`✓ Database initialized: ${dbPath}`);
  if (!noIndex) console.log('✓ FTS5 search index ready');
  console.log('\nNext steps:');
  console.log('  scrobbledb auth        — configure API credentials');
  console.log('  scrobbledb ingest      — download listening history');
  console.log('  scrobbledb search <q>  — search your music');
}

async function resetCmd({ database, noIndex = false, force = false } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  if (!fs.existsSync(dbPath)) {
    console.log(`Database does not exist: ${dbPath}`);
    console.log("Run 'scrobbledb config init' to create it.");
    return;
  }

  if (!force) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(r => rl.question(
      `⚠️  This will DELETE all data in ${dbPath}. Type 'yes' to confirm: `, r
    ));
    rl.close();
    if (answer.trim().toLowerCase() !== 'yes') {
      console.log('Reset cancelled.');
      return;
    }
  }

  fs.unlinkSync(dbPath);
  console.log(`✓ Deleted: ${dbPath}`);

  const db = new Database(dbPath);
  setupSchema(db);
  if (!noIndex) {
    rebuildFts5(db);
    console.log('✓ FTS5 search index initialized');
  }
  db.close();
  console.log(`✓ New empty database created: ${dbPath}`);
}

function locationCmd() {
  const dataDir = getDataDir();
  const dbPath = path.join(dataDir, 'scrobbledb.db');
  const authPath = path.join(dataDir, 'auth.json');
  console.log('\nscrobbledb locations');
  console.log('─'.repeat(50));
  console.log(`Data directory: ${dataDir} ${fs.existsSync(dataDir) ? '(exists)' : '(not created)'}`);
  console.log(`Database:       ${dbPath} ${fs.existsSync(dbPath) ? '(exists)' : '(not found)'}`);
  console.log(`Auth file:      ${authPath} ${fs.existsSync(authPath) ? '(exists)' : '(not found)'}`);
  console.log('');
}

module.exports = { initCmd, resetCmd, locationCmd };
