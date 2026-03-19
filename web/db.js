'use strict';

const Database = require('better-sqlite3');
const fs = require('fs');

let _db = null;
let _dbPath = null;
let _dbAvailable = false;

function init(dbPath) {
  _dbPath = dbPath;
  if (!fs.existsSync(dbPath)) {
    _dbAvailable = false;
    return;
  }
  try {
    _db = new Database(dbPath, { readonly: true });
    _dbAvailable = true;
  } catch (err) {
    _dbAvailable = false;
    console.error(`Failed to open database at ${dbPath}:`, err.message);
  }
}

function isAvailable() {
  return _dbAvailable;
}

function getDbPath() {
  return _dbPath;
}

function hasFts() {
  if (!_dbAvailable) return false;
  try {
    const row = _db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tracks_fts'")
      .get();
    return !!row;
  } catch {
    return false;
  }
}

function getStats() {
  if (!_dbAvailable) return null;
  return _db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM plays) as total_scrobbles,
      (SELECT COUNT(*) FROM artists) as unique_artists,
      (SELECT COUNT(*) FROM albums) as unique_albums,
      (SELECT COUNT(*) FROM tracks) as unique_tracks,
      (SELECT MIN(timestamp) FROM plays) as first_scrobble,
      (SELECT MAX(timestamp) FROM plays) as last_scrobble
  `).get();
}

function getTopArtists({ limit = 50, offset = 0 } = {}) {
  if (!_dbAvailable) return [];
  return _db.prepare(`
    SELECT artists.name, COUNT(plays.track_id) as play_count
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id
    GROUP BY artists.id
    ORDER BY play_count DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

function getTopAlbums({ limit = 50, offset = 0 } = {}) {
  if (!_dbAvailable) return [];
  return _db.prepare(`
    SELECT albums.title, artists.name as artist_name, COUNT(plays.track_id) as play_count
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id
    GROUP BY albums.id
    ORDER BY play_count DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

function getTopTracks({ limit = 50, offset = 0 } = {}) {
  if (!_dbAvailable) return [];
  return _db.prepare(`
    SELECT tracks.title, artists.name as artist_name, albums.title as album_title, COUNT(*) as play_count
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id
    GROUP BY tracks.id
    ORDER BY play_count DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

function search(query, { limit = 50 } = {}) {
  if (!_dbAvailable || !query) return [];
  if (hasFts()) {
    try {
      return _db.prepare(`
        SELECT tracks.title, artists.name as artist_name, albums.title as album_title
        FROM tracks_fts
        JOIN tracks ON tracks_fts.rowid = tracks.rowid
        JOIN albums ON tracks.album_id = albums.id
        JOIN artists ON albums.artist_id = artists.id
        WHERE tracks_fts MATCH ?
        LIMIT ?
      `).all(query, limit);
    } catch {
      // fall through to LIKE
    }
  }
  // Escape LIKE special characters so user input is treated as a literal substring.
  const escaped = query.replace(/[\\%_]/g, c => `\\${c}`);
  const pattern = `%${escaped}%`;
  return _db.prepare(`
    SELECT tracks.title, artists.name as artist_name, albums.title as album_title
    FROM tracks
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id
    WHERE tracks.title LIKE ? ESCAPE '\\'
       OR artists.name LIKE ? ESCAPE '\\'
       OR albums.title LIKE ? ESCAPE '\\'
    LIMIT ?
  `).all(pattern, pattern, pattern, limit);
}

module.exports = { init, isAvailable, getDbPath, getStats, getTopArtists, getTopAlbums, getTopTracks, search };
