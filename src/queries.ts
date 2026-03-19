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

// ─── Streaks ──────────────────────────────────────────────────────────────────

export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  total_days_listened: number;
  total_active_weeks: number;
}

export function getListeningStreak(db: Database): StreakInfo {
  const rows = db
    .query(`SELECT DISTINCT strftime('%Y-%m-%d', timestamp) AS day FROM plays ORDER BY day ASC`)
    .all() as { day: string }[];

  if (rows.length === 0)
    return { current_streak: 0, longest_streak: 0, total_days_listened: 0, total_active_weeks: 0 };

  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Longest streak
  let longestStreak = 1, tempStreak = 1;
  for (let i = 1; i < rows.length; i++) {
    const diff =
      (new Date(rows[i]!.day).getTime() - new Date(rows[i - 1]!.day).getTime()) / 86_400_000;
    if (diff === 1) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak); }
    else            tempStreak = 1;
  }

  // Current streak (streak ending today or yesterday)
  let currentStreak = 0;
  const lastDay = rows[rows.length - 1]?.day;
  if (lastDay === today || lastDay === yesterday) {
    currentStreak = 1;
    for (let i = rows.length - 2; i >= 0; i--) {
      const diff =
        (new Date(rows[i + 1]!.day).getTime() - new Date(rows[i]!.day).getTime()) / 86_400_000;
      if (diff === 1) currentStreak++;
      else break;
    }
  }

  // Active weeks (distinct ISO weeks)
  const weeks = new Set(
    rows.map(r => {
      const d   = new Date(r.day);
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const wk  = Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${wk}`;
    }),
  );

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    total_days_listened: rows.length,
    total_active_weeks: weeks.size,
  };
}

// ─── Year / month counts ──────────────────────────────────────────────────────

export function getScrobblesThisYear(db: Database): number {
  const y = new Date().getFullYear();
  const row = db.query(`SELECT COUNT(*) AS n FROM plays WHERE timestamp >= ?`).get(`${y}-01-01`) as { n: number };
  return row?.n ?? 0;
}

export function getScrobblesThisMonth(db: Database): number {
  const now   = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const row   = db.query(`SELECT COUNT(*) AS n FROM plays WHERE timestamp >= ?`).get(start) as { n: number };
  return row?.n ?? 0;
}

// ─── Daily heatmap ────────────────────────────────────────────────────────────

export interface HeatmapDay {
  date: string;  // YYYY-MM-DD
  count: number;
}

export function getDailyHeatmap(db: Database, years = 2): HeatmapDay[] {
  const since = new Date();
  since.setFullYear(since.getFullYear() - years);
  return db
    .query(
      `SELECT strftime('%Y-%m-%d', timestamp) AS date, COUNT(*) AS count
       FROM plays WHERE timestamp >= ?
       GROUP BY date ORDER BY date ASC`,
    )
    .all(since.toISOString()) as HeatmapDay[];
}

// ─── Artist universe graph ────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  name: string;
  play_count: number;
  first_heard: string | null;
  last_played: string | null;
  is_core: boolean;
  is_forgotten: boolean;
  cluster: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface ArtistGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function getArtistGraph(db: Database, limit = 80): ArtistGraph {
  // Top artists by play count
  const raw = db
    .query(
      `SELECT artists.id AS id, artists.name AS name,
         COUNT(plays.timestamp) AS play_count,
         MIN(plays.timestamp)   AS first_heard,
         MAX(plays.timestamp)   AS last_played
       FROM artists
       JOIN albums  ON albums.artist_id = artists.id
       JOIN tracks  ON tracks.album_id  = albums.id
       JOIN plays   ON plays.track_id   = tracks.id
       GROUP BY artists.id
       ORDER BY play_count DESC
       LIMIT ?`,
    )
    .all(limit) as Omit<GraphNode, "is_core" | "is_forgotten" | "cluster">[];

  if (raw.length === 0) return { nodes: [], edges: [] };

  const nodeIds = raw.map(n => n.id);
  const ph      = nodeIds.map(() => "?").join(",");

  // Co-listening edges: days where two artists were both listened to
  const edges = db
    .query(
      `SELECT a1.aid AS source, a2.aid AS target, COUNT(*) AS weight
       FROM (
         SELECT DISTINCT artists.id AS aid, strftime('%Y-%m-%d', plays.timestamp) AS day
         FROM plays
         JOIN tracks  ON plays.track_id  = tracks.id
         JOIN albums  ON tracks.album_id = albums.id
         JOIN artists ON albums.artist_id = artists.id
         WHERE artists.id IN (${ph})
       ) a1
       JOIN (
         SELECT DISTINCT artists.id AS aid, strftime('%Y-%m-%d', plays.timestamp) AS day
         FROM plays
         JOIN tracks  ON plays.track_id  = tracks.id
         JOIN albums  ON tracks.album_id = albums.id
         JOIN artists ON albums.artist_id = artists.id
         WHERE artists.id IN (${ph})
       ) a2 ON a1.day = a2.day AND a1.aid < a2.aid
       GROUP BY a1.aid, a2.aid
       HAVING weight >= 2
       ORDER BY weight DESC
       LIMIT 400`,
    )
    .all(...nodeIds, ...nodeIds) as GraphEdge[];

  // ── Union-Find clustering (iterative path-halving) ──────────────────────────
  const parent = new Map<string, string>();
  for (const n of raw) parent.set(n.id, n.id);

  const find = (x: string): string => {
    while (parent.get(x) !== x) {
      const gp = parent.get(parent.get(x)!)!;
      parent.set(x, gp);
      x = gp;
    }
    return x;
  };
  const union = (a: string, b: string) => { parent.set(find(a), find(b)); };
  for (const e of edges.slice(0, 200)) union(e.source, e.target);

  const clusterMap = new Map<string, number>();
  let nextCluster = 0;
  for (const n of raw) {
    const root = find(n.id);
    if (!clusterMap.has(root)) clusterMap.set(root, nextCluster++);
  }

  // Thresholds
  const sorted      = [...raw].sort((a, b) => b.play_count - a.play_count);
  const coreThresh  = sorted[Math.floor(sorted.length * 0.25)]?.play_count ?? 0;
  const medianPlays = sorted[Math.floor(sorted.length / 2)]?.play_count ?? 0;
  const cutoff180   = new Date(Date.now() - 180 * 86_400_000).toISOString();

  const nodes: GraphNode[] = raw.map(n => ({
    ...n,
    is_core:      n.play_count >= coreThresh,
    is_forgotten: !!n.last_played && n.last_played < cutoff180 && n.play_count > medianPlays,
    cluster:      clusterMap.get(find(n.id)) ?? 0,
  }));

  return { nodes, edges };
}

// ─── Taste drift / DNA ────────────────────────────────────────────────────────

export interface TasteDrift {
  era_label: string;
  current_top: { name: string; plays: number }[];
  year_ago_top: { name: string; plays: number }[];
  new_artists: string[];
  drifted_away: string[];
  consistency_score: number;
}

export function getTasteDrift(db: Database): TasteDrift {
  const now     = new Date();
  const since30 = new Date(now.getTime() - 30  * 86_400_000).toISOString();
  const ya_s    = new Date(now.getTime() - 395 * 86_400_000).toISOString();
  const ya_e    = new Date(now.getTime() - 335 * 86_400_000).toISOString();

  const topArtistsSince = (s: string, e?: string) =>
    db
      .query(
        `SELECT artists.name, COUNT(*) AS plays
         FROM plays
         JOIN tracks  ON plays.track_id  = tracks.id
         JOIN albums  ON tracks.album_id = albums.id
         JOIN artists ON albums.artist_id = artists.id
         WHERE plays.timestamp >= ?${e ? " AND plays.timestamp <= ?" : ""}
         GROUP BY artists.id ORDER BY plays DESC LIMIT 10`,
      )
      .all(...(e ? [s, e] : [s])) as { name: string; plays: number }[];

  const current  = topArtistsSince(since30);
  const yearAgo  = topArtistsSince(ya_s, ya_e);

  const curSet  = new Set(current.map(a => a.name));
  const pastSet = new Set(yearAgo.map(a => a.name));

  const newArtists  = current.filter(a => !pastSet.has(a.name)).map(a => a.name);
  const driftedAway = yearAgo.filter(a => !curSet.has(a.name)).map(a => a.name);
  const overlap     = current.filter(a => pastSet.has(a.name)).length;
  const consistency = current.length > 0 ? Math.round((overlap / current.length) * 100) : 0;

  let eraLabel = "discovery era";
  if (current[0]) {
    const top1 = current[0].name;
    if      (consistency > 70)          eraLabel = `deep in your ${top1} era`;
    else if (newArtists.length > 5)     eraLabel = `new horizons era`;
    else if (driftedAway.length > 5)    eraLabel = `transitional era`;
    else                                eraLabel = `${top1} era`;
  }

  return {
    era_label:        eraLabel,
    current_top:      current,
    year_ago_top:     yearAgo,
    new_artists:      newArtists,
    drifted_away:     driftedAway,
    consistency_score: consistency,
  };
}
