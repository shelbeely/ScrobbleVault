'use strict';

function getStats(db) {
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM plays) as total_scrobbles,
      (SELECT COUNT(*) FROM artists) as unique_artists,
      (SELECT COUNT(*) FROM albums) as unique_albums,
      (SELECT COUNT(*) FROM tracks) as unique_tracks,
      (SELECT MIN(timestamp) FROM plays) as first_scrobble,
      (SELECT MAX(timestamp) FROM plays) as last_scrobble
  `).get();
}

function getTopArtists(db, { limit = 50, offset = 0, since = null, until = null } = {}) {
  let where = '';
  const params = [];
  if (since || until) {
    const conds = [];
    if (since) { conds.push('plays.timestamp >= ?'); params.push(since); }
    if (until) { conds.push('plays.timestamp <= ?'); params.push(until); }
    where = 'WHERE ' + conds.join(' AND ');
  }
  params.push(limit, offset);
  return db.prepare(`
    SELECT artists.name, COUNT(plays.track_id) as play_count
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id
    ${where}
    GROUP BY artists.id
    ORDER BY play_count DESC
    LIMIT ? OFFSET ?
  `).all(...params);
}

function getTopAlbums(db, { limit = 50, offset = 0, since = null, until = null } = {}) {
  let where = '';
  const params = [];
  if (since || until) {
    const conds = [];
    if (since) { conds.push('plays.timestamp >= ?'); params.push(since); }
    if (until) { conds.push('plays.timestamp <= ?'); params.push(until); }
    where = 'WHERE ' + conds.join(' AND ');
  }
  params.push(limit, offset);
  return db.prepare(`
    SELECT albums.title, artists.name as artist_name, COUNT(plays.track_id) as play_count
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id
    ${where}
    GROUP BY albums.id
    ORDER BY play_count DESC
    LIMIT ? OFFSET ?
  `).all(...params);
}

function getTopTracks(db, { limit = 50, offset = 0, since = null, until = null } = {}) {
  let where = '';
  const params = [];
  if (since || until) {
    const conds = [];
    if (since) { conds.push('plays.timestamp >= ?'); params.push(since); }
    if (until) { conds.push('plays.timestamp <= ?'); params.push(until); }
    where = 'WHERE ' + conds.join(' AND ');
  }
  params.push(limit, offset);
  return db.prepare(`
    SELECT tracks.title, artists.name as artist_name, albums.title as album_title, COUNT(*) as play_count
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id
    ${where}
    GROUP BY tracks.id
    ORDER BY play_count DESC
    LIMIT ? OFFSET ?
  `).all(...params);
}

function getRecentPlays(db, { limit = 50, offset = 0, since = null, until = null } = {}) {
  let where = '';
  const params = [];
  if (since || until) {
    const conds = [];
    if (since) { conds.push('plays.timestamp >= ?'); params.push(since); }
    if (until) { conds.push('plays.timestamp <= ?'); params.push(until); }
    where = 'WHERE ' + conds.join(' AND ');
  }
  params.push(limit, offset);
  return db.prepare(`
    SELECT plays.timestamp, tracks.title, artists.name as artist_name, albums.title as album_title
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id
    ${where}
    ORDER BY plays.timestamp DESC
    LIMIT ? OFFSET ?
  `).all(...params);
}

function hasFts(db) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tracks_fts'").get();
}

function search(db, query, { limit = 50 } = {}) {
  if (!query) return [];
  if (hasFts(db)) {
    try {
      return db.prepare(`
        SELECT tracks.title, artists.name as artist_name, albums.title as album_title
        FROM tracks_fts
        JOIN tracks ON tracks_fts.rowid = tracks.rowid
        JOIN albums ON tracks.album_id = albums.id
        JOIN artists ON albums.artist_id = artists.id
        WHERE tracks_fts MATCH ?
        LIMIT ?
      `).all(query, limit);
    } catch { /* fall through */ }
  }
  const escaped = query.replace(/[\\%_]/g, c => `\\${c}`);
  const pattern = `%${escaped}%`;
  return db.prepare(`
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

function getMonthlyRollup(db, { since = null, until = null, limit = null } = {}) {
  const conds = [];
  const params = [];
  if (since) { conds.push('timestamp >= ?'); params.push(since); }
  if (until) { conds.push('timestamp <= ?'); params.push(until); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const limitClause = limit != null ? 'LIMIT ?' : '';
  if (limit != null) params.push(parseInt(limit, 10));
  return db.prepare(`
    SELECT
      CAST(strftime('%Y', datetime(timestamp, 'unixepoch')) AS INTEGER) as year,
      CAST(strftime('%m', datetime(timestamp, 'unixepoch')) AS INTEGER) as month,
      COUNT(*) as scrobbles,
      COUNT(DISTINCT plays.track_id) as unique_tracks,
      COUNT(DISTINCT tracks.album_id) as unique_albums,
      COUNT(DISTINCT albums.artist_id) as unique_artists
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN albums ON tracks.album_id = albums.id
    ${where}
    GROUP BY year, month
    ORDER BY year DESC, month DESC
    ${limitClause}
  `).all(...params);
}

function getYearlyRollup(db, { since = null, until = null, limit = null } = {}) {
  const conds = [];
  const params = [];
  if (since) { conds.push('timestamp >= ?'); params.push(since); }
  if (until) { conds.push('timestamp <= ?'); params.push(until); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const limitClause = limit != null ? 'LIMIT ?' : '';
  if (limit != null) params.push(parseInt(limit, 10));
  return db.prepare(`
    SELECT
      CAST(strftime('%Y', datetime(timestamp, 'unixepoch')) AS INTEGER) as year,
      COUNT(*) as scrobbles,
      COUNT(DISTINCT plays.track_id) as unique_tracks,
      COUNT(DISTINCT tracks.album_id) as unique_albums,
      COUNT(DISTINCT albums.artist_id) as unique_artists
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN albums ON tracks.album_id = albums.id
    ${where}
    GROUP BY year
    ORDER BY year DESC
    ${limitClause}
  `).all(...params);
}

module.exports = {
  getStats, getTopArtists, getTopAlbums, getTopTracks, getRecentPlays,
  hasFts, search, getMonthlyRollup, getYearlyRollup,
};
