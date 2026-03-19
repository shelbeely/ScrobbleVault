'use strict';
// db.js - Database module for the web server
// Wraps lib/queries.js with lazy initialization

const Database = require('better-sqlite3');
const fs = require('fs');
const queries = require('./lib/queries');

let _db = null;
let _dbPath = null;
let _dbAvailable = false;

function init(dbPath) {
  _dbPath = dbPath;
  if (!fs.existsSync(dbPath)) { _dbAvailable = false; return; }
  try {
    _db = new Database(dbPath, { readonly: true });
    _dbAvailable = true;
  } catch (err) {
    _dbAvailable = false;
    console.error(`Failed to open database at ${dbPath}:`, err.message);
  }
}

function isAvailable() { return _dbAvailable; }
function getDbPath() { return _dbPath; }
function hasFts() {
  if (!_dbAvailable) return false;
  try { return queries.hasFts(_db); } catch { return false; }
}

function getStats() { return _dbAvailable ? queries.getStats(_db) : null; }
function getTopArtists(opts) { return _dbAvailable ? queries.getTopArtists(_db, opts) : []; }
function getTopAlbums(opts) { return _dbAvailable ? queries.getTopAlbums(_db, opts) : []; }
function getTopTracks(opts) { return _dbAvailable ? queries.getTopTracks(_db, opts) : []; }
function search(q, opts) { return _dbAvailable ? queries.search(_db, q, opts) : []; }

module.exports = { init, isAvailable, getDbPath, hasFts, getStats, getTopArtists, getTopAlbums, getTopTracks, search };
