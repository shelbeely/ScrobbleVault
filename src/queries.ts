/**
 * Database query functions for scrobbledb.
 *
 * All query results are plain objects ready for JSON serialisation or
 * table rendering.  Queries are parameterised to prevent SQL injection.
 */

import type { Database } from "bun:sqlite";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OverviewStats {
  total_scrobbles: number;
  unique_artists: number;
  unique_albums: number;
  unique_tracks: number;
  first_scrobble: string | null;
  last_scrobble: string | null;
}

export interface MonthlyRollup {
  year: number;
  month: number;
  scrobbles: number;
  unique_artists: number;
  unique_albums: number;
  unique_tracks: number;
}

export interface YearlyRollup {
  year: number;
  scrobbles: number;
  unique_artists: number;
  unique_albums: number;
  unique_tracks: number;
}

export interface ArtistRow {
  artist_id: string;
  artist_name: string;
  album_count: number;
  track_count: number;
  play_count: number;
  last_played: string | null;
}

export interface AlbumRow {
  album_id: string;
  album_title: string;
  artist_id: string;
  artist_name: string;
  track_count: number;
  play_count: number;
  last_played: string | null;
}

export interface TrackRow {
  track_id: string;
  track_title: string;
  album_id: string;
  album_title: string;
  artist_id: string;
  artist_name: string;
  play_count: number;
  last_played: string | null;
}

export interface PlayRow {
  timestamp: string;
  track_title: string;
  album_title: string;
  artist_name: string;
  track_id: string;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Attempt to parse a human-readable date string into a Date.
 * Supports ISO 8601 and simple English expressions like "7 days ago".
 */
export function parseRelativeDate(input: string): Date | null {
  // Try ISO 8601 first
  const d = new Date(input);
  if (!isNaN(d.getTime())) return d;

  // Simple relative expressions: "N days/weeks/months/years ago"
  const m = input.match(/^(\d+)\s+(day|week|month|year)s?\s+ago$/i);
  if (m) {
    const n = parseInt(m[1] ?? "0", 10);
    const unit = (m[2] ?? "day").toLowerCase();
    const now = new Date();
    if (unit === "day") now.setDate(now.getDate() - n);
    else if (unit === "week") now.setDate(now.getDate() - n * 7);
    else if (unit === "month") now.setMonth(now.getMonth() - n);
    else if (unit === "year") now.setFullYear(now.getFullYear() - n);
    return now;
  }

  // "today" / "yesterday"
  if (/^today$/i.test(input)) return new Date();
  if (/^yesterday$/i.test(input)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }

  return null;
}

/** Build a WHERE clause fragment for timestamp filtering. */
function timestampFilter(since?: Date | null, until?: Date | null): {
  clause: string;
  params: string[];
} {
  const parts: string[] = [];
  const params: string[] = [];

  if (since) {
    parts.push("plays.timestamp >= ?");
    params.push(since.toISOString());
  }
  if (until) {
    parts.push("plays.timestamp <= ?");
    params.push(until.toISOString());
  }

  return {
    clause: parts.length ? "WHERE " + parts.join(" AND ") : "",
    params,
  };
}

// ─── Stats queries ────────────────────────────────────────────────────────────

export function getOverviewStats(db: Database): OverviewStats {
  const row = db
    .query(
      `SELECT
        (SELECT COUNT(*) FROM plays)   AS total_scrobbles,
        (SELECT COUNT(*) FROM artists) AS unique_artists,
        (SELECT COUNT(*) FROM albums)  AS unique_albums,
        (SELECT COUNT(*) FROM tracks)  AS unique_tracks,
        (SELECT MIN(timestamp) FROM plays) AS first_scrobble,
        (SELECT MAX(timestamp) FROM plays) AS last_scrobble`,
    )
    .get() as OverviewStats;
  return row;
}

export function getMonthlyRollup(
  db: Database,
  opts: { since?: Date | null; until?: Date | null; limit?: number | null } = {},
): MonthlyRollup[] {
  const { clause, params } = timestampFilter(opts.since, opts.until);
  const limitClause = opts.limit && opts.limit > 0 ? `LIMIT ${opts.limit}` : "";
  return db
    .query(
      `SELECT
        CAST(strftime('%Y', plays.timestamp) AS INTEGER) AS year,
        CAST(strftime('%m', plays.timestamp) AS INTEGER) AS month,
        COUNT(*) AS scrobbles,
        COUNT(DISTINCT artists.id) AS unique_artists,
        COUNT(DISTINCT albums.id)  AS unique_albums,
        COUNT(DISTINCT tracks.id)  AS unique_tracks
      FROM plays
      JOIN tracks  ON plays.track_id  = tracks.id
      JOIN albums  ON tracks.album_id = albums.id
      JOIN artists ON albums.artist_id = artists.id
      ${clause}
      GROUP BY year, month
      ORDER BY year DESC, month DESC
      ${limitClause}`,
    )
    .all(...params) as MonthlyRollup[];
}

export function getYearlyRollup(
  db: Database,
  opts: { since?: Date | null; until?: Date | null; limit?: number | null } = {},
): YearlyRollup[] {
  const { clause, params } = timestampFilter(opts.since, opts.until);
  const limitClause = opts.limit && opts.limit > 0 ? `LIMIT ${opts.limit}` : "";
  return db
    .query(
      `SELECT
        CAST(strftime('%Y', plays.timestamp) AS INTEGER) AS year,
        COUNT(*) AS scrobbles,
        COUNT(DISTINCT artists.id) AS unique_artists,
        COUNT(DISTINCT albums.id)  AS unique_albums,
        COUNT(DISTINCT tracks.id)  AS unique_tracks
      FROM plays
      JOIN tracks  ON plays.track_id  = tracks.id
      JOIN albums  ON tracks.album_id = albums.id
      JOIN artists ON albums.artist_id = artists.id
      ${clause}
      GROUP BY year
      ORDER BY year DESC
      ${limitClause}`,
    )
    .all(...params) as YearlyRollup[];
}

// ─── Artists ──────────────────────────────────────────────────────────────────

export function getArtists(
  db: Database,
  opts: {
    limit?: number;
    sortBy?: "plays" | "name" | "recent";
    order?: "asc" | "desc";
    minPlays?: number;
    search?: string;
  } = {},
): ArtistRow[] {
  const { limit = 20, sortBy = "plays", order = "desc", minPlays = 0, search } = opts;

  const searchJoin = search
    ? `JOIN tracks_fts ON tracks_fts.artist_id = artists.id AND tracks_fts MATCH ?`
    : "";
  const searchParam = search ? [search + "*"] : [];

  const orderExpr =
    sortBy === "name"
      ? `artists.name ${order.toUpperCase()}`
      : sortBy === "recent"
        ? `last_played ${order.toUpperCase()} NULLS LAST`
        : `play_count ${order.toUpperCase()}`;

  const havingClause = minPlays > 0 ? `HAVING play_count >= ${minPlays}` : "";

  return db
    .query(
      `SELECT
        artists.id   AS artist_id,
        artists.name AS artist_name,
        COUNT(DISTINCT albums.id)  AS album_count,
        COUNT(DISTINCT tracks.id)  AS track_count,
        COUNT(plays.timestamp)     AS play_count,
        MAX(plays.timestamp)       AS last_played
      FROM artists
      ${searchJoin}
      LEFT JOIN albums ON albums.artist_id = artists.id
      LEFT JOIN tracks ON tracks.album_id  = albums.id
      LEFT JOIN plays  ON plays.track_id   = tracks.id
      GROUP BY artists.id
      ${havingClause}
      ORDER BY ${orderExpr}
      LIMIT ${limit}`,
    )
    .all(...searchParam) as ArtistRow[];
}

export function getTopArtists(
  db: Database,
  opts: { limit?: number; since?: Date | null; until?: Date | null } = {},
): (ArtistRow & { rank: number; percentage: number })[] {
  const { limit = 20 } = opts;
  const { clause, params } = timestampFilter(opts.since, opts.until);

  const rows = db
    .query(
      `SELECT
        artists.id   AS artist_id,
        artists.name AS artist_name,
        COUNT(*)     AS play_count,
        MAX(plays.timestamp) AS last_played,
        COUNT(DISTINCT albums.id) AS album_count,
        COUNT(DISTINCT tracks.id) AS track_count
      FROM plays
      JOIN tracks  ON plays.track_id  = tracks.id
      JOIN albums  ON tracks.album_id = albums.id
      JOIN artists ON albums.artist_id = artists.id
      ${clause}
      GROUP BY artists.id
      ORDER BY play_count DESC
      LIMIT ${limit}`,
    )
    .all(...params) as ArtistRow[];

  const total = rows.reduce((s, r) => s + r.play_count, 0) || 1;
  return rows.map((r, i) => ({
    ...r,
    rank: i + 1,
    percentage: Math.round((r.play_count / total) * 1000) / 10,
  }));
}

// ─── Albums ───────────────────────────────────────────────────────────────────

export function getAlbums(
  db: Database,
  opts: {
    limit?: number;
    sortBy?: "plays" | "title" | "recent";
    order?: "asc" | "desc";
    artistId?: string;
    search?: string;
  } = {},
): AlbumRow[] {
  const { limit = 20, sortBy = "plays", order = "desc", artistId, search } = opts;

  const whereParts: string[] = [];
  const whereParams: (string | number)[] = [];

  if (artistId) {
    whereParts.push("albums.artist_id = ?");
    whereParams.push(artistId);
  }
  if (search) {
    whereParts.push(`albums.title LIKE ?`);
    whereParams.push(`%${search}%`);
  }

  const whereClause = whereParts.length ? "WHERE " + whereParts.join(" AND ") : "";

  const orderExpr =
    sortBy === "title"
      ? `albums.title ${order.toUpperCase()}`
      : sortBy === "recent"
        ? `last_played ${order.toUpperCase()} NULLS LAST`
        : `play_count ${order.toUpperCase()}`;

  return db
    .query(
      `SELECT
        albums.id     AS album_id,
        albums.title  AS album_title,
        artists.id    AS artist_id,
        artists.name  AS artist_name,
        COUNT(DISTINCT tracks.id) AS track_count,
        COUNT(plays.timestamp)    AS play_count,
        MAX(plays.timestamp)      AS last_played
      FROM albums
      JOIN artists ON albums.artist_id = artists.id
      LEFT JOIN tracks ON tracks.album_id = albums.id
      LEFT JOIN plays  ON plays.track_id  = tracks.id
      ${whereClause}
      GROUP BY albums.id
      ORDER BY ${orderExpr}
      LIMIT ${limit}`,
    )
    .all(...whereParams) as AlbumRow[];
}

// ─── Tracks ───────────────────────────────────────────────────────────────────

export function getTracks(
  db: Database,
  opts: {
    limit?: number;
    sortBy?: "plays" | "title" | "recent";
    order?: "asc" | "desc";
    artistId?: string;
    albumId?: string;
    search?: string;
  } = {},
): TrackRow[] {
  const { limit = 20, sortBy = "plays", order = "desc", artistId, albumId, search } = opts;

  const whereParts: string[] = [];
  const whereParams: (string | number)[] = [];

  if (artistId) {
    whereParts.push("albums.artist_id = ?");
    whereParams.push(artistId);
  }
  if (albumId) {
    whereParts.push("tracks.album_id = ?");
    whereParams.push(albumId);
  }
  if (search) {
    whereParts.push(`tracks.title LIKE ?`);
    whereParams.push(`%${search}%`);
  }

  const whereClause = whereParts.length ? "WHERE " + whereParts.join(" AND ") : "";

  const orderExpr =
    sortBy === "title"
      ? `tracks.title ${order.toUpperCase()}`
      : sortBy === "recent"
        ? `last_played ${order.toUpperCase()} NULLS LAST`
        : `play_count ${order.toUpperCase()}`;

  return db
    .query(
      `SELECT
        tracks.id    AS track_id,
        tracks.title AS track_title,
        albums.id    AS album_id,
        albums.title AS album_title,
        artists.id   AS artist_id,
        artists.name AS artist_name,
        COUNT(plays.timestamp) AS play_count,
        MAX(plays.timestamp)   AS last_played
      FROM tracks
      JOIN albums  ON tracks.album_id  = albums.id
      JOIN artists ON albums.artist_id = artists.id
      LEFT JOIN plays ON plays.track_id = tracks.id
      ${whereClause}
      GROUP BY tracks.id
      ORDER BY ${orderExpr}
      LIMIT ${limit}`,
    )
    .all(...whereParams) as TrackRow[];
}

/** Full-text search using the FTS5 index. Falls back to LIKE if unavailable. */
export function searchTracks(
  db: Database,
  query: string,
  limit = 20,
): TrackRow[] {
  try {
    return db
      .query(
        `SELECT
          tracks.id    AS track_id,
          tracks.title AS track_title,
          albums.id    AS album_id,
          albums.title AS album_title,
          artists.id   AS artist_id,
          artists.name AS artist_name,
          COUNT(plays.timestamp) AS play_count,
          MAX(plays.timestamp)   AS last_played
        FROM tracks_fts
        JOIN tracks  ON tracks_fts.track_id  = tracks.id
        JOIN albums  ON tracks.album_id       = albums.id
        JOIN artists ON albums.artist_id      = artists.id
        LEFT JOIN plays ON plays.track_id = tracks.id
        WHERE tracks_fts MATCH ?
        GROUP BY tracks.id
        ORDER BY play_count DESC
        LIMIT ?`,
      )
      .all(query + "*", limit) as TrackRow[];
  } catch {
    // Fallback: simple LIKE search
    const like = `%${query}%`;
    return db
      .query(
        `SELECT
          tracks.id    AS track_id,
          tracks.title AS track_title,
          albums.id    AS album_id,
          albums.title AS album_title,
          artists.id   AS artist_id,
          artists.name AS artist_name,
          COUNT(plays.timestamp) AS play_count,
          MAX(plays.timestamp)   AS last_played
        FROM tracks
        JOIN albums  ON tracks.album_id  = albums.id
        JOIN artists ON albums.artist_id = artists.id
        LEFT JOIN plays ON plays.track_id = tracks.id
        WHERE tracks.title LIKE ? OR albums.title LIKE ? OR artists.name LIKE ?
        GROUP BY tracks.id
        ORDER BY play_count DESC
        LIMIT ?`,
      )
      .all(like, like, like, limit) as TrackRow[];
  }
}

// ─── Plays ────────────────────────────────────────────────────────────────────

export function getPlays(
  db: Database,
  opts: {
    limit?: number;
    since?: Date | null;
    until?: Date | null;
    artistId?: string;
    trackId?: string;
  } = {},
): PlayRow[] {
  const { limit = 50, artistId, trackId } = opts;
  const whereParts: string[] = [];
  const whereParams: (string | number)[] = [];

  if (opts.since) {
    whereParts.push("plays.timestamp >= ?");
    whereParams.push(opts.since.toISOString());
  }
  if (opts.until) {
    whereParts.push("plays.timestamp <= ?");
    whereParams.push(opts.until.toISOString());
  }
  if (artistId) {
    whereParts.push("artists.id = ?");
    whereParams.push(artistId);
  }
  if (trackId) {
    whereParts.push("plays.track_id = ?");
    whereParams.push(trackId);
  }

  const whereClause = whereParts.length ? "WHERE " + whereParts.join(" AND ") : "";

  return db
    .query(
      `SELECT
        plays.timestamp AS timestamp,
        tracks.title    AS track_title,
        albums.title    AS album_title,
        artists.name    AS artist_name,
        tracks.id       AS track_id
      FROM plays
      JOIN tracks  ON plays.track_id  = tracks.id
      JOIN albums  ON tracks.album_id = albums.id
      JOIN artists ON albums.artist_id = artists.id
      ${whereClause}
      ORDER BY plays.timestamp DESC
      LIMIT ${limit}`,
    )
    .all(...whereParams) as PlayRow[];
}
