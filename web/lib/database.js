'use strict';
const Database = require('better-sqlite3');

function openDb(dbPath, { readonly = false } = {}) {
  return new Database(dbPath, { readonly });
}

function setupSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist_id TEXT NOT NULL,
      FOREIGN KEY (artist_id) REFERENCES artists(id)
    );
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      album_id TEXT NOT NULL,
      FOREIGN KEY (album_id) REFERENCES albums(id)
    );
    CREATE TABLE IF NOT EXISTS plays (
      track_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      PRIMARY KEY (track_id, timestamp),
      FOREIGN KEY (track_id) REFERENCES tracks(id)
    );
  `);
}

function setupFts5(db) {
  const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tracks_fts'").get();
  if (existing) return;
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
      title,
      artist_name,
      album_title,
      content=''
    );
  `);
}

function rebuildFts5(db) {
  db.exec(`DROP TABLE IF EXISTS tracks_fts;`);
  db.exec(`
    CREATE VIRTUAL TABLE tracks_fts USING fts5(
      title,
      artist_name,
      album_title,
      content=''
    );
    INSERT INTO tracks_fts(rowid, title, artist_name, album_title)
    SELECT tracks.rowid, tracks.title, artists.name, albums.title
    FROM tracks
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id;
  `);
}

// Upsert a single scrobble record (artist, album, track, play)
const upsertScrobble = db => {
  const upsertArtist = db.prepare(`INSERT OR IGNORE INTO artists (id, name) VALUES (?, ?)`);
  const upsertAlbum = db.prepare(`INSERT OR IGNORE INTO albums (id, title, artist_id) VALUES (?, ?, ?)`);
  const upsertTrack = db.prepare(`INSERT OR IGNORE INTO tracks (id, title, album_id) VALUES (?, ?, ?)`);
  const upsertPlay = db.prepare(`INSERT OR IGNORE INTO plays (track_id, timestamp) VALUES (?, ?)`);

  return db.transaction((scrobble) => {
    const { artist, album, track, timestamp } = scrobble;
    upsertArtist.run(artist.id, artist.name);
    upsertAlbum.run(album.id, album.title, artist.id);
    upsertTrack.run(track.id, track.title, album.id);
    upsertPlay.run(track.id, timestamp);
    return { artist, album, track, timestamp };
  });
};

// Batch upsert scrobbles
function batchUpsert(db, scrobbles) {
  const upsert = upsertScrobble(db);
  let count = 0;
  const batchTx = db.transaction((items) => {
    for (const s of items) {
      upsert(s);
      count++;
    }
  });
  batchTx(scrobbles);
  return count;
}

function getLatestTimestamp(db) {
  const row = db.prepare('SELECT MAX(timestamp) as ts FROM plays').get();
  return row?.ts || null;
}

module.exports = { openDb, setupSchema, setupFts5, rebuildFts5, batchUpsert, getLatestTimestamp };
