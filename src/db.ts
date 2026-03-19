/**
 * Database initialisation and helpers.
 *
 * Uses Bun-native APIs exclusively:
 *   - bun:sqlite          for zero-dependency SQLite access
 *   - Bun.spawnSync/env   for directory creation (no "fs" import)
 *
 * Schema mirrors the original Python scrobbledb and extends it with
 * local-user auth, session storage, metadata for ingested scrobbles, and
 * current now-playing state for the self-hosted compatibility backend.
 */

import { Database } from "bun:sqlite";
import { getDefaultDbPath, getDataDirSync } from "./config";

// ─── Directory bootstrap ──────────────────────────────────────────────────────

/** Ensure the data directory exists using Bun.spawnSync — no "fs" import. */
function ensureDataDir(): void {
  const dir = getDataDirSync();
  Bun.spawnSync(["mkdir", "-p", dir]);
}

// ─── Connection ───────────────────────────────────────────────────────────────

let _db: Database | null = null;

export function openDb(dbPath?: string): Database {
  if (_db) return _db;
  ensureDataDir();
  const path = dbPath ?? getDefaultDbPath();
  _db = new Database(path, { create: true });
  _db.exec("PRAGMA journal_mode = WAL;");
  _db.exec("PRAGMA foreign_keys = ON;");
  return _db;
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export function initSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS artists (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS albums (
      id        TEXT PRIMARY KEY,
      title     TEXT NOT NULL,
      artist_id TEXT NOT NULL REFERENCES artists(id)
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id       TEXT PRIMARY KEY,
      title    TEXT NOT NULL,
      album_id TEXT NOT NULL REFERENCES albums(id)
    );

    CREATE TABLE IF NOT EXISTS plays (
      timestamp TEXT NOT NULL,
      track_id  TEXT NOT NULL REFERENCES tracks(id),
      PRIMARY KEY (timestamp, track_id)
    );

    CREATE TABLE IF NOT EXISTS play_metadata (
      timestamp   TEXT NOT NULL,
      track_id    TEXT NOT NULL,
      source      TEXT,
      client      TEXT,
      raw_payload TEXT,
      PRIMARY KEY (timestamp, track_id),
      FOREIGN KEY (timestamp, track_id) REFERENCES plays(timestamp, track_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_md5  TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_sessions (
      id           TEXT PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      token_hash   TEXT NOT NULL UNIQUE,
      created_at   TEXT NOT NULL,
      expires_at   TEXT NOT NULL,
      last_used_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS now_playing (
      user_id          INTEGER PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
      artist_name      TEXT NOT NULL,
      artist_key       TEXT NOT NULL,
      album_title      TEXT,
      album_key        TEXT,
      track_title      TEXT NOT NULL,
      track_key        TEXT NOT NULL,
      started_at       TEXT NOT NULL,
      duration_seconds INTEGER,
      source           TEXT,
      client           TEXT,
      raw_payload      TEXT,
      updated_at       TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_plays_timestamp      ON plays (timestamp);
    CREATE INDEX IF NOT EXISTS idx_plays_track_id       ON plays (track_id);
    CREATE INDEX IF NOT EXISTS idx_play_metadata_source ON play_metadata (source);
    CREATE INDEX IF NOT EXISTS idx_albums_artist        ON albums (artist_id);
    CREATE INDEX IF NOT EXISTS idx_tracks_album         ON tracks (album_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash  ON app_sessions (token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id     ON app_sessions (user_id);
    CREATE INDEX IF NOT EXISTS idx_now_playing_updated  ON now_playing (updated_at);
  `);
}

// ─── FTS5 ────────────────────────────────────────────────────────────────────

export function setupFts5(db: Database): void {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
      artist_name,
      album_title,
      track_title,
      artist_id UNINDEXED,
      album_id  UNINDEXED,
      track_id  UNINDEXED
    );

    CREATE TRIGGER IF NOT EXISTS artists_ai AFTER INSERT ON artists BEGIN
      DELETE FROM tracks_fts WHERE artist_id = new.id;
      INSERT INTO tracks_fts (artist_name, album_title, track_title, artist_id, album_id, track_id)
      SELECT new.name, albums.title, tracks.title, new.id, albums.id, tracks.id
      FROM albums JOIN tracks ON albums.id = tracks.album_id
      WHERE albums.artist_id = new.id;
    END;

    CREATE TRIGGER IF NOT EXISTS artists_au AFTER UPDATE ON artists BEGIN
      DELETE FROM tracks_fts WHERE artist_id = new.id;
      INSERT INTO tracks_fts (artist_name, album_title, track_title, artist_id, album_id, track_id)
      SELECT new.name, albums.title, tracks.title, new.id, albums.id, tracks.id
      FROM albums JOIN tracks ON albums.id = tracks.album_id
      WHERE albums.artist_id = new.id;
    END;

    CREATE TRIGGER IF NOT EXISTS artists_ad AFTER DELETE ON artists BEGIN
      DELETE FROM tracks_fts WHERE artist_id = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS albums_ai AFTER INSERT ON albums BEGIN
      DELETE FROM tracks_fts WHERE album_id = new.id;
      INSERT INTO tracks_fts (artist_name, album_title, track_title, artist_id, album_id, track_id)
      SELECT artists.name, new.title, tracks.title, new.artist_id, new.id, tracks.id
      FROM artists JOIN tracks ON tracks.album_id = new.id
      WHERE artists.id = new.artist_id;
    END;

    CREATE TRIGGER IF NOT EXISTS albums_au AFTER UPDATE ON albums BEGIN
      DELETE FROM tracks_fts WHERE album_id = new.id;
      INSERT INTO tracks_fts (artist_name, album_title, track_title, artist_id, album_id, track_id)
      SELECT artists.name, new.title, tracks.title, new.artist_id, new.id, tracks.id
      FROM artists JOIN tracks ON tracks.album_id = new.id
      WHERE artists.id = new.artist_id;
    END;

    CREATE TRIGGER IF NOT EXISTS albums_ad AFTER DELETE ON albums BEGIN
      DELETE FROM tracks_fts WHERE album_id = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS tracks_ai AFTER INSERT ON tracks BEGIN
      INSERT INTO tracks_fts (artist_name, album_title, track_title, artist_id, album_id, track_id)
      SELECT artists.name, albums.title, new.title, artists.id, albums.id, new.id
      FROM albums JOIN artists ON albums.artist_id = artists.id
      WHERE albums.id = new.album_id;
    END;

    CREATE TRIGGER IF NOT EXISTS tracks_au AFTER UPDATE ON tracks BEGIN
      DELETE FROM tracks_fts WHERE track_id = new.id;
      INSERT INTO tracks_fts (artist_name, album_title, track_title, artist_id, album_id, track_id)
      SELECT artists.name, albums.title, new.title, artists.id, albums.id, new.id
      FROM albums JOIN artists ON albums.artist_id = artists.id
      WHERE albums.id = new.album_id;
    END;

    CREATE TRIGGER IF NOT EXISTS tracks_ad AFTER DELETE ON tracks BEGIN
      DELETE FROM tracks_fts WHERE track_id = old.id;
    END;
  `);
}

export function rebuildFts5(db: Database): void {
  db.exec(`
    DELETE FROM tracks_fts;
    INSERT INTO tracks_fts (artist_name, album_title, track_title, artist_id, album_id, track_id)
    SELECT artists.name, albums.title, tracks.title, artists.id, albums.id, tracks.id
    FROM tracks
    JOIN albums  ON tracks.album_id  = albums.id
    JOIN artists ON albums.artist_id = artists.id;
  `);
}

// ─── Row types ────────────────────────────────────────────────────────────────

export interface ArtistRow {
  id: string;
  name: string;
}

export interface AlbumRow {
  id: string;
  title: string;
  artist_id: string;
}

export interface TrackRow {
  id: string;
  title: string;
  album_id: string;
}

export interface PlayRow {
  timestamp: string;
  track_id: string;
}

export interface PlayMetadataRow {
  timestamp: string;
  track_id: string;
  source: string | null;
  client: string | null;
  raw_payload: string | null;
}

// ─── Upsert helpers ───────────────────────────────────────────────────────────

export function upsertArtist(db: Database, row: ArtistRow): void {
  db.prepare("INSERT OR REPLACE INTO artists (id, name) VALUES (?, ?)")
    .run(row.id, row.name);
}

export function upsertAlbum(db: Database, row: AlbumRow): void {
  db.prepare("INSERT OR REPLACE INTO albums (id, title, artist_id) VALUES (?, ?, ?)")
    .run(row.id, row.title, row.artist_id);
}

export function upsertTrack(db: Database, row: TrackRow): void {
  db.prepare("INSERT OR REPLACE INTO tracks (id, title, album_id) VALUES (?, ?, ?)")
    .run(row.id, row.title, row.album_id);
}

export function upsertPlay(db: Database, row: PlayRow): void {
  db.prepare("INSERT OR IGNORE INTO plays (timestamp, track_id) VALUES (?, ?)")
    .run(row.timestamp, row.track_id);
}

export function upsertPlayMetadata(db: Database, row: PlayMetadataRow): void {
  db.prepare(
    `INSERT OR REPLACE INTO play_metadata (timestamp, track_id, source, client, raw_payload)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(row.timestamp, row.track_id, row.source, row.client, row.raw_payload);
}

export function upsertBatch(
  db: Database,
  artists: ArtistRow[],
  albums: AlbumRow[],
  tracks: TrackRow[],
  plays: PlayRow[],
): void {
  db.transaction(() => {
    const ua = db.prepare("INSERT OR REPLACE INTO artists (id, name) VALUES (?, ?)");
    const ub = db.prepare("INSERT OR REPLACE INTO albums (id, title, artist_id) VALUES (?, ?, ?)");
    const ut = db.prepare("INSERT OR REPLACE INTO tracks (id, title, album_id) VALUES (?, ?, ?)");
    const up = db.prepare("INSERT OR IGNORE INTO plays (timestamp, track_id) VALUES (?, ?)");
    for (const artist of artists) ua.run(artist.id, artist.name);
    for (const album of albums) ub.run(album.id, album.title, album.artist_id);
    for (const track of tracks) ut.run(track.id, track.title, track.album_id);
    for (const play of plays) up.run(play.timestamp, play.track_id);
  })();
}

// ─── Utility queries ──────────────────────────────────────────────────────────

export function hasPlays(db: Database): boolean {
  try {
    return db.query("SELECT 1 FROM plays LIMIT 1").get() !== null;
  } catch {
    return false;
  }
}

export function getLatestTimestamp(db: Database): string | null {
  try {
    const row = db.query("SELECT MAX(timestamp) AS ts FROM plays").get() as { ts: string | null };
    return row?.ts ?? null;
  } catch {
    return null;
  }
}
