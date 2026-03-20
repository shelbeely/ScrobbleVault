/**
 * HTTP route handlers for the ScrobbleVault web app.
 *
 * Each handler receives the parsed URL and request, performs DB queries
 * (or API calls for ingest), and returns a Response.
 */

import type { Database } from "bun:sqlite";

import {
  buildLogoutCookie,
  buildSessionCookie,
  createSession,
  destroySession,
  getAuthenticatedUser,
  getSessionTokenFromRequest,
  getUserFromSessionToken,
  verifyUserCredentials,
} from "../auth";
import {
  SCROBBLEVAULT_COMPAT_APP_KEY,
  SCROBBLEVAULT_COMPAT_SHARED_SECRET,
  getNetworkDisplayName,
  loadAuth,
  normalizeCompatApiUrl,
  saveAuth,
  type NetworkName,
} from "../config";
import { getLatestTimestamp, initSchema, setupFts5, upsertBatch } from "../db";
import { formatListenBrainzListen, formatListenBrainzPlayingNow, listenBrainzNowPlayingInput, listenBrainzScrobbleInput, parseListenBrainzSubmitBody } from "../listenbrainz";
import { getSessionKey, getRecentTracksCount, recentTracks } from "../lastfm";
import {
  getAlbums,
  getArtistGraph,
  getArtists,
  getDailyHeatmap,
  getListeningStreak,
  getMonthlyRollup,
  getOverviewStats,
  getPlays,
  getScrobblesThisMonth,
  getScrobblesThisYear,
  getTasteDrift,
  getTopAlbums,
  getTopArtists,
  getTopTracks,
  getTracks,
  getWrappedYear,
  getWrappedYears,
  getYearlyRollup,
  parseRelativeDate,
  searchTracks,
} from "../queries";
import {
  getNowPlaying,
  insertScrobble,
  updateNowPlaying,
} from "../scrobble";
import {
  renderAlbumDetail,
  renderAlbums,
  renderArtistDetail,
  renderArtists,
  renderDashboard,
  renderIngest,
  renderLogin,
  renderNowPlaying,
  renderPlays,
  renderSearch,
  renderSettings,
  renderStats,
  renderTaste,
  renderTimeline,
  renderTrackDetail,
  renderTracks,
  renderUniverse,
  renderWrapped,
} from "./templates";

const PAGE_SIZE = 50;
const DEFAULT_RECENT_LIMIT = 50;
const MAX_COMPAT_SCROBBLES = 50;
const ARTIST_SORT_FIELDS = ["plays", "name", "recent"] as const;
const ALBUM_SORT_FIELDS = ["plays", "title", "recent"] as const;
const TRACK_SORT_FIELDS = ["plays", "title", "recent"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function html(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...headers },
  });
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

function redirect(to: string, headers: Record<string, string> = {}): Response {
  return new Response(null, { status: 302, headers: { Location: to, ...headers } });
}

function qp(url: URL, name: string, fallback: string): string {
  return url.searchParams.get(name) ?? fallback;
}

function qpInt(url: URL, name: string, fallback: number): number {
  const value = url.searchParams.get(name);
  const number = value ? parseInt(value, 10) : Number.NaN;
  return Number.isNaN(number) ? fallback : number;
}

function qpChoice<T extends string>(
  url: URL,
  name: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = url.searchParams.get(name);
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}

function parseDateParam(url: URL, name: string): Date | null {
  const value = url.searchParams.get(name)?.trim();
  return value ? parseRelativeDate(value) : null;
}

/** Parse a form body from a POST request. */
async function parseForm(req: Request): Promise<URLSearchParams> {
  const text = await req.text();
  return new URLSearchParams(text);
}

async function parseJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Total number of pages for a given count and page size. */
function totalPages(count: number, size: number): number {
  return Math.max(1, Math.ceil(count / size));
}

function getArtistDetailRecord(db: Database, id: string): Record<string, unknown> | null {
  return db.query(
    `SELECT artists.id AS artist_id, artists.name AS artist_name,
       COUNT(DISTINCT albums.id) AS album_count,
       COUNT(DISTINCT tracks.id) AS track_count,
       COUNT(plays.timestamp) AS play_count,
       MAX(plays.timestamp) AS last_played
     FROM artists
     LEFT JOIN albums ON albums.artist_id = artists.id
     LEFT JOIN tracks ON tracks.album_id = albums.id
     LEFT JOIN plays  ON plays.track_id = tracks.id
     WHERE artists.id = ?
     GROUP BY artists.id`,
  ).get(id) as Record<string, unknown> | null;
}

function getAlbumDetailRecord(db: Database, id: string): Record<string, unknown> | null {
  return db.query(
    `SELECT albums.id AS album_id, albums.title AS album_title,
       artists.id AS artist_id, artists.name AS artist_name,
       COUNT(DISTINCT tracks.id) AS track_count,
       COUNT(plays.timestamp) AS play_count,
       MAX(plays.timestamp) AS last_played
     FROM albums
     JOIN artists ON albums.artist_id = artists.id
     LEFT JOIN tracks ON tracks.album_id = albums.id
     LEFT JOIN plays  ON plays.track_id = tracks.id
     WHERE albums.id = ?
     GROUP BY albums.id`,
  ).get(id) as Record<string, unknown> | null;
}

function getTrackDetailRecord(db: Database, id: string): Record<string, unknown> | null {
  return db.query(
    `SELECT tracks.id AS track_id, tracks.title AS track_title,
       albums.id AS album_id, albums.title AS album_title,
       artists.id AS artist_id, artists.name AS artist_name,
       COUNT(plays.timestamp) AS play_count,
       MAX(plays.timestamp) AS last_played
     FROM tracks
     JOIN albums  ON tracks.album_id = albums.id
     JOIN artists ON albums.artist_id = artists.id
     LEFT JOIN plays ON plays.track_id = tracks.id
     WHERE tracks.id = ?
     GROUP BY tracks.id`,
  ).get(id) as Record<string, unknown> | null;
}

function getRecentPlayCount(db: Database, since: Date | null, until: Date | null): number {
  const conditions: string[] = [];
  const params: string[] = [];
  if (since) {
    conditions.push("plays.timestamp >= ?");
    params.push(since.toISOString());
  }
  if (until) {
    conditions.push("plays.timestamp <= ?");
    params.push(until.toISOString());
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const row = db.query(`SELECT COUNT(*) AS count FROM plays ${where}`).get(...params) as { count: number } | null;
  return row?.count ?? 0;
}

function requireApiUser(req: Request, db: Database): { id: number; username: string; created_at: string; updated_at: string } | Response {
  const user = getAuthenticatedUser(req, db);
  return user ?? json({ error: "authentication_required", message: "Login required." }, 401);
}

async function parseCompatibilityParams(req: Request, url: URL): Promise<URLSearchParams> {
  const params = new URLSearchParams(url.searchParams);
  if (req.method.toUpperCase() === "POST") {
    const bodyParams = await parseForm(req);
    for (const [key, value] of bodyParams.entries()) params.append(key, value);
  }
  return params;
}

function compatError(message: string, error = 13, status = 400): Response {
  return json({ error, message }, status);
}

function compatValues(params: URLSearchParams, name: string): string[] {
  const indexed: Array<[number, string]> = [];
  for (const [key, value] of params.entries()) {
    const match = key.match(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\[(\\d+)\\]$`));
    if (match) indexed.push([parseInt(match[1] ?? "0", 10), value]);
  }
  if (indexed.length > 0) {
    return indexed.sort((a, b) => a[0] - b[0]).map(([, value]) => value);
  }
  return params.getAll(name);
}

function compatTrackPayload(row: {
  timestamp: string;
  track_id: string;
  track_title: string;
  album_id: string;
  album_title: string;
  artist_id: string;
  artist_name: string;
}) {
  return {
    artist: { "#text": row.artist_name, mbid: row.artist_id },
    album: { "#text": row.album_title, mbid: row.album_id },
    name: row.track_title,
    mbid: row.track_id,
    date: { uts: String(Math.floor(new Date(row.timestamp).getTime() / 1000)) },
  };
}

async function handleCompatibilityRequest(req: Request, url: URL, db: Database): Promise<Response> {
  const params = await parseCompatibilityParams(req, url);
  const method = params.get("method")?.trim();
  const userAgent = req.headers.get("user-agent") ?? "compat-client";

  if (!method) return compatError("Missing method parameter.", 6, 400);

  if (method === "auth.getMobileSession") {
    const username = params.get("username")?.trim() ?? "";
    const password = params.get("password")?.trim() ?? "";
    const user = await verifyUserCredentials(db, username, password);
    if (!user) return compatError("Invalid username or password.", 4, 403);

    const session = createSession(db, user.id);
    return json({
      session: {
        name: user.username,
        key: session.token,
        subscriber: 0,
      },
    });
  }

  if (method === "user.getInfo") {
    const userFromSession = getUserFromSessionToken(db, params.get("sk")?.trim() ?? "");
    const username = params.get("user")?.trim() ?? userFromSession?.username ?? "";
    if (!username) return compatError("Missing user or session key.", 10, 403);

    const user = db.query(
      `SELECT id, username, created_at FROM app_users WHERE username = ?`,
    ).get(username) as { id: number; username: string; created_at: string } | null;

    if (!user) return compatError("Unknown user.", 6, 404);

    const stats = getOverviewStats(db);
    return json({
      user: {
        name: user.username,
        realname: user.username,
        playcount: String(stats.total_scrobbles),
        playlists: "0",
        bootstrap: "0",
        subscriber: "0",
        type: "user",
        url: "",
        registered: {
          unixtime: String(Math.floor(new Date(user.created_at).getTime() / 1000)),
        },
      },
    });
  }

  if (method === "user.getRecentTracks") {
    const username = params.get("user")?.trim() ?? "";
    if (!username) return compatError("Missing user parameter.", 6, 400);

    const limit = Math.max(1, Math.min(200, parseInt(params.get("limit") ?? "50", 10) || 50));
    const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
    const from = params.get("from");
    const to = params.get("to");
    const since = from ? new Date(parseInt(from, 10) * 1_000) : null;
    const until = to ? new Date(parseInt(to, 10) * 1_000) : null;

    const conditions: string[] = [];
    const countParams: string[] = [];
    if (since && !Number.isNaN(since.getTime())) {
      conditions.push("plays.timestamp >= ?");
      countParams.push(since.toISOString());
    }
    if (until && !Number.isNaN(until.getTime())) {
      conditions.push("plays.timestamp <= ?");
      countParams.push(until.toISOString());
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const total = db.query(`SELECT COUNT(*) AS count FROM plays ${where}`).get(...countParams) as { count: number } | null;
    const totalCount = total?.count ?? 0;

    const rows = db.query(
      `SELECT plays.timestamp, tracks.id AS track_id, tracks.title AS track_title,
              albums.id AS album_id, albums.title AS album_title,
              artists.id AS artist_id, artists.name AS artist_name
       FROM plays
       JOIN tracks  ON plays.track_id = tracks.id
       JOIN albums  ON tracks.album_id = albums.id
       JOIN artists ON albums.artist_id = artists.id
       ${where}
       ORDER BY plays.timestamp DESC
       LIMIT ${limit}
       OFFSET ${(page - 1) * limit}`,
    ).all(...countParams) as Array<{
      timestamp: string;
      track_id: string;
      track_title: string;
      album_id: string;
      album_title: string;
      artist_id: string;
      artist_name: string;
    }>;

    return json({
      recenttracks: {
        track: rows.map(compatTrackPayload),
        "@attr": {
          page: String(page),
          perPage: String(limit),
          totalPages: String(totalPages(totalCount, limit)),
          total: String(totalCount),
          user: username,
        },
      },
    });
  }

  if (method === "track.updateNowPlaying") {
    const user = getUserFromSessionToken(db, params.get("sk")?.trim() ?? "");
    if (!user) return compatError("Invalid session key.", 9, 403);

    const artist = params.get("artist")?.trim() ?? "";
    const track = params.get("track")?.trim() ?? "";
    if (!artist || !track) return compatError("artist and track are required.", 6, 400);

    const state = updateNowPlaying(db, user.id, {
      artist,
      track,
      album: params.get("album")?.trim() || null,
      startedAt: params.get("timestamp")?.trim() || undefined,
      durationSeconds: params.get("duration") ? parseInt(params.get("duration") ?? "", 10) || null : null,
      client: params.get("client")?.trim() || userAgent,
      source: "compat",
      rawPayload: Object.fromEntries(params.entries()),
    });

    return json({
      nowplaying: {
        track: { "#text": state.track_title },
        artist: { "#text": state.artist_name },
        album: { "#text": state.album_title ?? "" },
        ignoredMessage: { code: "0", "#text": "" },
      },
    });
  }

  if (method === "track.scrobble") {
    const user = getUserFromSessionToken(db, params.get("sk")?.trim() ?? "");
    if (!user) return compatError("Invalid session key.", 9, 403);

    const artists = compatValues(params, "artist");
    const tracks = compatValues(params, "track");
    const albums = compatValues(params, "album");
    const timestamps = compatValues(params, "timestamp");
    const count = Math.min(MAX_COMPAT_SCROBBLES, Math.max(artists.length, tracks.length, timestamps.length));
    if (count === 0) return compatError("No scrobbles supplied.", 6, 400);

    let accepted = 0;
    let ignored = 0;
    const responseRows: Array<Record<string, unknown>> = [];

    for (let index = 0; index < count; index++) {
      const artist = artists[index] ?? artists[0] ?? "";
      const track = tracks[index] ?? tracks[0] ?? "";
      const timestamp = timestamps[index] ?? timestamps[0] ?? "";
      if (!artist || !track || !timestamp) {
        ignored++;
        responseRows.push({
          track: { "#text": track },
          artist: { "#text": artist },
          album: { "#text": albums[index] ?? albums[0] ?? "" },
          timestamp,
          ignoredMessage: { code: "1", "#text": "Missing artist, track, or timestamp." },
        });
        continue;
      }

      const inserted = insertScrobble(db, {
        artist,
        track,
        album: albums[index] ?? albums[0] ?? null,
        listenedAt: parseInt(timestamp, 10),
        source: "compat",
        client: params.get("client")?.trim() || userAgent,
        rawPayload: Object.fromEntries(params.entries()),
      });

      if (inserted.duplicate) {
        ignored++;
      } else {
        accepted++;
      }

      responseRows.push({
        track: { "#text": inserted.scrobble.track.title, mbid: inserted.scrobble.track.id },
        artist: { "#text": inserted.scrobble.artist.name, mbid: inserted.scrobble.artist.id },
        album: { "#text": inserted.scrobble.album.title, mbid: inserted.scrobble.album.id },
        timestamp: String(Math.floor(new Date(inserted.scrobble.play.timestamp).getTime() / 1_000)),
        ignoredMessage: inserted.duplicate
          ? { code: "1", "#text": "Duplicate scrobble skipped." }
          : { code: "0", "#text": "" },
      });
    }

    return json({
      scrobbles: {
        "@attr": {
          accepted: String(accepted),
          ignored: String(ignored),
        },
        scrobble: responseRows,
      },
    });
  }

  return compatError(`Unsupported method ${method}.`, 3, 400);
}

// ─── Route registry ───────────────────────────────────────────────────────────

function listenBrainzError(message: string, status = 400): Response {
  return json({ code: status, error: message }, status);
}

function getUserByUsername(db: Database, username: string): { id: number; username: string; created_at: string } | null {
  return db.query(
    `SELECT id, username, created_at FROM app_users WHERE username = ?`,
  ).get(username) as { id: number; username: string; created_at: string } | null;
}

async function handleListenBrainzSubmit(req: Request, db: Database): Promise<Response> {
  const user = getAuthenticatedUser(req, db);
  if (!user) return listenBrainzError("Invalid authorization token.", 401);

  const body = await parseJsonBody(req);
  const parsed = parseListenBrainzSubmitBody(body);
  if (!parsed || parsed.payload.length === 0) {
    return listenBrainzError("Invalid ListenBrainz payload.", 400);
  }

  const userAgent = req.headers.get("user-agent") ?? "listenbrainz-client";
  if (parsed.listenType === "playing_now") {
    const nowPlaying = listenBrainzNowPlayingInput(parsed.payload[0]!, userAgent);
    if (!nowPlaying) return listenBrainzError("track_metadata.artist_name and track_metadata.track_name are required.", 400);

    const state = updateNowPlaying(db, user.id, nowPlaying);
    return json({
      status: "ok",
      payload: {
        count: 1,
        playing_now: true,
        listens: [formatListenBrainzPlayingNow(state)],
      },
    });
  }

  const responsePayload: Array<Record<string, unknown>> = [];
  let insertedCount = 0;
  for (const listen of parsed.payload) {
    const scrobbleInput = listenBrainzScrobbleInput(listen, userAgent);
    if (!scrobbleInput) {
      responsePayload.push({ inserted: false, reason: "missing required listen metadata" });
      continue;
    }
    const inserted = insertScrobble(db, scrobbleInput);
    responsePayload.push({
      inserted: !inserted.duplicate,
      duplicate: inserted.duplicate,
      listened_at: Math.floor(new Date(inserted.scrobble.play.timestamp).getTime() / 1000),
      track_metadata: {
        artist_name: inserted.scrobble.artist.name,
        track_name: inserted.scrobble.track.title,
        release_name: inserted.scrobble.album.title === "(single)" ? "" : inserted.scrobble.album.title,
      },
    });
    if (!inserted.duplicate) insertedCount++;
  }

  return json({
    status: "ok",
    payload: {
      count: insertedCount,
      listens: responsePayload,
    },
  });
}

function handleListenBrainzValidateToken(req: Request, db: Database): Response {
  const token = getSessionTokenFromRequest(req) ?? new URL(req.url).searchParams.get("token")?.trim() ?? "";
  if (!token) return listenBrainzError("No token provided.", 400);
  const user = getUserFromSessionToken(db, token);
  return json(user
    ? { code: 200, message: "Token valid.", valid: true, user_name: user.username }
    : { code: 200, message: "Token invalid.", valid: false });
}

function handleListenBrainzListens(url: URL, db: Database, username: string): Response {
  const user = getUserByUsername(db, username);
  if (!user) return listenBrainzError("User not found.", 404);

  const count = Math.max(1, Math.min(200, qpInt(url, "count", 25)));
  const maxTsValue = url.searchParams.get("max_ts")?.trim();
  const minTsValue = url.searchParams.get("min_ts")?.trim();
  if (maxTsValue && minTsValue) return listenBrainzError("Specify max_ts or min_ts, not both.", 400);

  const conditions: string[] = [];
  const params: string[] = [];
  if (maxTsValue) {
    const maxTs = parseInt(maxTsValue, 10);
    if (!Number.isNaN(maxTs)) {
      conditions.push("plays.timestamp < ?");
      params.push(new Date(maxTs * 1000).toISOString());
    }
  }
  if (minTsValue) {
    const minTs = parseInt(minTsValue, 10);
    if (!Number.isNaN(minTs)) {
      conditions.push("plays.timestamp > ?");
      params.push(new Date(minTs * 1000).toISOString());
    }
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db.query(
    `SELECT plays.timestamp, tracks.title AS track_title, albums.title AS album_title,
            artists.name AS artist_name, play_metadata.source AS source, play_metadata.client AS client
     FROM plays
     JOIN tracks  ON plays.track_id = tracks.id
     JOIN albums  ON tracks.album_id = albums.id
     JOIN artists ON albums.artist_id = artists.id
     LEFT JOIN play_metadata ON play_metadata.timestamp = plays.timestamp AND play_metadata.track_id = plays.track_id
     ${where}
     ORDER BY plays.timestamp DESC
     LIMIT ${count}`,
  ).all(...params) as Array<{
    timestamp: string;
    track_title: string;
    album_title: string;
    artist_name: string;
    source: string | null;
    client: string | null;
  }>;

  return json({
    payload: {
      count: rows.length,
      user_id: user.username,
      listens: rows.map(formatListenBrainzListen),
    },
  });
}

function handleListenBrainzListenCount(db: Database, username: string): Response {
  const user = getUserByUsername(db, username);
  if (!user) return listenBrainzError("User not found.", 404);
  const row = db.query(`SELECT COUNT(*) AS count FROM plays`).get() as { count: number } | null;
  return json({ payload: { count: row?.count ?? 0 } });
}

function handleListenBrainzPlayingNow(db: Database, username: string): Response {
  const user = getUserByUsername(db, username);
  if (!user) return listenBrainzError("User not found.", 404);

  const nowPlaying = getNowPlaying(db, user.id);
  return json({
    payload: {
      count: nowPlaying ? 1 : 0,
      user_id: user.username,
      playing_now: !!nowPlaying,
      listens: nowPlaying ? [formatListenBrainzPlayingNow(nowPlaying)] : [],
    },
  });
}

type Handler = (req: Request, url: URL, db: Database, match: RegExpMatchArray) => Promise<Response> | Response;

interface Route {
  method: "GET" | "POST";
  pattern: RegExp;
  handler: Handler;
}

const routes: Route[] = [];

function get(pattern: RegExp, handler: Handler) {
  routes.push({ method: "GET", pattern, handler });
}
function post(pattern: RegExp, handler: Handler) {
  routes.push({ method: "POST", pattern, handler });
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export function routeRequest(req: Request, db: Database): Promise<Response> | Response {
  const url = new URL(req.url);
  const method = req.method.toUpperCase() as "GET" | "POST";

  for (const route of routes) {
    if (route.method !== method) continue;
    const match = url.pathname.match(route.pattern);
    if (match) return route.handler(req, url, db, match);
  }

  return html("<h1>404 Not Found</h1>", 404);
}

// ─── Health + auth pages ──────────────────────────────────────────────────────

get(/^\/health$/, (_req, _url, db) => {
  const nowPlaying = getNowPlaying(db);
  return json({
    ok: true,
    service: "scrobblevault",
    version: "2.2.0",
    supportedProtocols: {
      lastfm: "/2.0/",
      librefm: "/2.0/",
      listenbrainz: "/1/",
    },
    totalScrobbles: getOverviewStats(db).total_scrobbles,
    nowPlaying,
    timestamp: new Date().toISOString(),
  });
});

get(/^\/login$/, (_req) => html(renderLogin()));

post(/^\/login$/, async (req, _url, db) => {
  const form = await parseForm(req);
  const username = form.get("username")?.trim() ?? "";
  const password = form.get("password") ?? "";
  const user = await verifyUserCredentials(db, username, password);
  if (!user) {
    return html(renderLogin({ type: "error", message: "Invalid username or password." }), 401);
  }

  const session = createSession(db, user.id);
  return redirect("/settings", { "Set-Cookie": buildSessionCookie(session.token, session.expiresAt) });
});

post(/^\/logout$/, (req, _url, db) => {
  const token = getSessionTokenFromRequest(req);
  if (token) destroySession(db, token);
  return redirect("/login", { "Set-Cookie": buildLogoutCookie() });
});

// ─── Brain (enhanced dashboard) ──────────────────────────────────────────────

get(/^\/$/, (_req, _url, db) => {
  const stats = getOverviewStats(db);
  const topArtists = getTopArtists(db, { limit: 10 });
  const streak = getListeningStreak(db);
  const thisYear = getScrobblesThisYear(db);
  const thisMonth = getScrobblesThisMonth(db);

  const graph = getArtistGraph(db, 60);
  const clusterMap = new Map<number, { topArtist: string; artists: string[]; plays: number }>();
  for (const node of graph.nodes) {
    const existing = clusterMap.get(node.cluster);
    if (!existing) {
      clusterMap.set(node.cluster, { topArtist: node.name, artists: [node.name], plays: node.play_count });
    } else {
      existing.artists.push(node.name);
      if (node.play_count > existing.plays) {
        existing.topArtist = node.name;
        existing.plays = node.play_count;
      }
    }
  }
  const genreClusters = [...clusterMap.entries()]
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 6);

  return html(renderDashboard(
    stats as unknown as Record<string, unknown>,
    topArtists as unknown as Record<string, unknown>[],
    streak,
    thisYear,
    thisMonth,
    genreClusters,
    getNowPlaying(db),
  ));
});

get(/^\/now-playing$/, (_req, _url, db) => html(renderNowPlaying(getNowPlaying(db))));

// ─── Artists ─────────────────────────────────────────────────────────────────

get(/^\/artists$/, (_req, url, db) => {
  const page = Math.max(1, qpInt(url, "page", 1));
  const sort = qpChoice(url, "sort", ARTIST_SORT_FIELDS, "plays");
  const order = qpChoice(url, "order", ["asc", "desc"] as const, "desc");
  const all = getArtists(db, { limit: 10_000, sortBy: sort, order });
  const slice = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return html(renderArtists(
    slice as unknown as Record<string, unknown>[],
    page,
    totalPages(all.length, PAGE_SIZE),
    sort,
    order,
  ));
});

get(/^\/artists\/([^/]+)$/, (_req, _url, db, match) => {
  const id = decodeURIComponent(match[1] ?? "");
  const artist = getArtistDetailRecord(db, id);
  if (!artist) return html("<h1>Artist not found</h1>", 404);

  const topTracks = getTracks(db, { artistId: id, limit: 20, sortBy: "plays", order: "desc" });
  const albums = getAlbums(db, { artistId: id, limit: 100, sortBy: "plays", order: "desc" });

  return html(renderArtistDetail(
    artist,
    topTracks as unknown as Record<string, unknown>[],
    albums as unknown as Record<string, unknown>[],
  ));
});

// ─── Albums ───────────────────────────────────────────────────────────────────

get(/^\/albums$/, (_req, url, db) => {
  const page = Math.max(1, qpInt(url, "page", 1));
  const sort = qpChoice(url, "sort", ALBUM_SORT_FIELDS, "plays");
  const order = qpChoice(url, "order", ["asc", "desc"] as const, "desc");
  const all = getAlbums(db, { limit: 10_000, sortBy: sort, order });
  const slice = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return html(renderAlbums(
    slice as unknown as Record<string, unknown>[],
    page,
    totalPages(all.length, PAGE_SIZE),
    sort,
    order,
  ));
});

get(/^\/albums\/([^/]+)$/, (_req, _url, db, match) => {
  const id = decodeURIComponent(match[1] ?? "");
  const album = getAlbumDetailRecord(db, id);
  if (!album) return html("<h1>Album not found</h1>", 404);

  const tracks = getTracks(db, { albumId: id, limit: 200, sortBy: "title", order: "asc" });
  return html(renderAlbumDetail(album, tracks as unknown as Record<string, unknown>[]));
});

// ─── Tracks ───────────────────────────────────────────────────────────────────

get(/^\/tracks$/, (_req, url, db) => {
  const page = Math.max(1, qpInt(url, "page", 1));
  const sort = qpChoice(url, "sort", TRACK_SORT_FIELDS, "plays");
  const order = qpChoice(url, "order", ["asc", "desc"] as const, "desc");
  const all = getTracks(db, { limit: 10_000, sortBy: sort, order });
  const slice = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return html(renderTracks(
    slice as unknown as Record<string, unknown>[],
    page,
    totalPages(all.length, PAGE_SIZE),
    sort,
    order,
  ));
});

get(/^\/tracks\/([^/]+)$/, (_req, _url, db, match) => {
  const id = decodeURIComponent(match[1] ?? "");
  const track = getTrackDetailRecord(db, id);
  if (!track) return html("<h1>Track not found</h1>", 404);

  const plays = getPlays(db, { trackId: id, limit: 200 });
  return html(renderTrackDetail(track, plays as unknown as Record<string, unknown>[]));
});

// ─── Plays ────────────────────────────────────────────────────────────────────

get(/^\/plays$/, (_req, url, db) => {
  const page = Math.max(1, qpInt(url, "page", 1));
  const limit = 10_000;
  const allPlays = getPlays(db, { limit });
  const slice = allPlays.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return html(renderPlays(
    slice as unknown as Record<string, unknown>[],
    page,
    totalPages(allPlays.length, PAGE_SIZE),
  ));
});

// ─── Stats ────────────────────────────────────────────────────────────────────

get(/^\/stats$/, (_req, _url, db) => {
  const overview = getOverviewStats(db);
  const monthly = getMonthlyRollup(db, { limit: 24 });
  const yearly = getYearlyRollup(db);
  return html(renderStats(
    overview as unknown as Record<string, unknown>,
    monthly as unknown as Record<string, unknown>[],
    yearly as unknown as Record<string, unknown>[],
  ));
});

// ─── Search ───────────────────────────────────────────────────────────────────

get(/^\/search$/, (_req, url, db) => {
  const query = qp(url, "q", "").trim();
  const results = query ? searchTracks(db, query, 100) : [];
  return html(renderSearch(query, results as unknown as Record<string, unknown>[]));
});

// ─── Settings ─────────────────────────────────────────────────────────────────

get(/^\/settings$/, () => {
  const auth = loadAuth();
  return html(renderSettings({
    network: auth?.lastfm_network ?? "lastfm",
    username: auth?.lastfm_username ?? "",
    customApiUrl: auth?.lastfm_custom_api_url ?? "",
    hasCredentials: !!auth?.lastfm_session_key,
  }));
});

post(/^\/settings\/auth$/, async (req) => {
  const form = await parseForm(req);
  const network = (form.get("network") ?? "lastfm") as NetworkName;
  const username = form.get("username")?.trim() ?? "";
  const password = form.get("password") ?? "";
  const customApiUrl = network === "scrobblevault"
    ? normalizeCompatApiUrl(form.get("custom_api_url")?.trim() ?? "")
    : undefined;

  const apiKey = network === "scrobblevault"
    ? SCROBBLEVAULT_COMPAT_APP_KEY
    : form.get("api_key")?.trim() ?? "";
  const secret = network === "scrobblevault"
    ? SCROBBLEVAULT_COMPAT_SHARED_SECRET
    : form.get("shared_secret")?.trim() ?? "";

  if (!username || !password || !apiKey || !secret) {
    return html(renderSettings(
      { network, username, customApiUrl: customApiUrl ?? "", hasCredentials: false },
      { type: "error", message: "All required fields must be provided." },
    ));
  }

  if (network === "librefm" && apiKey.length !== 32) {
    return html(renderSettings(
      { network, username, customApiUrl: "", hasCredentials: false },
      { type: "error", message: "Libre.fm API key must be exactly 32 characters. You can make one up — any 32-character string will work." },
    ));
  }

  if (network === "scrobblevault") {
    try {
      new URL(customApiUrl ?? "");
    } catch {
      return html(renderSettings(
        { network, username, customApiUrl: customApiUrl ?? "", hasCredentials: false },
        { type: "error", message: "Provide a valid ScrobbleVault compatibility API URL." },
      ));
    }
  }

  try {
    const sessionKey = await getSessionKey(network, apiKey, secret, username, password, { baseUrl: customApiUrl });
    await saveAuth({
      lastfm_network: network,
      lastfm_username: username,
      lastfm_api_key: apiKey,
      lastfm_shared_secret: secret,
      lastfm_session_key: sessionKey,
      lastfm_custom_api_url: customApiUrl,
    });
    return html(renderSettings(
      { network, username, customApiUrl: customApiUrl ?? "", hasCredentials: true },
      { type: "success", message: `✓ Authenticated as ${username} on ${getNetworkDisplayName(network)}.` },
    ));
  } catch (err) {
    return html(renderSettings(
      { network, username, customApiUrl: customApiUrl ?? "", hasCredentials: false },
      { type: "error", message: `Authentication failed: ${(err as Error).message}` },
    ));
  }
});

// ─── Ingest ───────────────────────────────────────────────────────────────────

get(/^\/ingest$/, (_req, _url, db) => {
  const auth = loadAuth();
  return html(renderIngest(
    !!auth?.lastfm_session_key,
    getLatestTimestamp(db),
  ));
});

post(/^\/ingest$/, async (req, _url, db) => {
  const auth = loadAuth();
  if (!auth?.lastfm_session_key) {
    return html(renderIngest(false, null, { type: "error", message: "No credentials. Configure them in Settings first." }));
  }

  const form = await parseForm(req);
  const sinceStr = form.get("since")?.trim();
  const untilStr = form.get("until")?.trim();
  const limitStr = form.get("limit")?.trim();

  const since = sinceStr ? parseRelativeDate(sinceStr) : null;
  const until = untilStr ? parseRelativeDate(untilStr) : null;
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;

  initSchema(db);
  setupFts5(db);

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  const write = (line: string) => writer.write(enc.encode(line + "\n"));

  (async () => {
    try {
      const { lastfm_network: network, lastfm_username: username,
        lastfm_api_key: apiKey, lastfm_session_key: sessionKey,
        lastfm_custom_api_url: customApiUrl } = auth;
      const secret = auth.lastfm_shared_secret;
      void secret;

      const latestTs = getLatestTimestamp(db);
      const sinceDate = since ?? (latestTs ? new Date(latestTs) : undefined);

      await write(`Checking ${getNetworkDisplayName(network)} for new scrobbles…`);

      const total = await getRecentTracksCount(network, apiKey, sessionKey, username,
        sinceDate ?? undefined, until ?? undefined, { baseUrl: customApiUrl });
      const expected = limit ? Math.min(limit, total) : total;
      await write(`Found ${expected.toLocaleString()} scrobble(s) to import.`);

      if (expected === 0) { await write("Nothing to import."); return; }

      let count = 0;
      const artistBuf: Parameters<typeof upsertBatch>[1] = [];
      const albumBuf: Parameters<typeof upsertBatch>[2] = [];
      const trackBuf: Parameters<typeof upsertBatch>[3] = [];
      const playBuf: Parameters<typeof upsertBatch>[4] = [];
      const batchSize = 200;

      for await (const scrobble of recentTracks(network, apiKey, sessionKey, username,
        { since: sinceDate ?? undefined, until: until ?? undefined, limit, pageSize: batchSize, baseUrl: customApiUrl })) {
        artistBuf.push(scrobble.artist);
        albumBuf.push(scrobble.album);
        trackBuf.push(scrobble.track);
        playBuf.push(scrobble.play);
        count++;

        if (artistBuf.length >= batchSize) {
          upsertBatch(db, [...artistBuf], [...albumBuf], [...trackBuf], [...playBuf]);
          artistBuf.length = albumBuf.length = trackBuf.length = playBuf.length = 0;
          const pct = expected > 0 ? Math.round((count / expected) * 100) : 0;
          await write(`  ${count.toLocaleString()} / ${expected.toLocaleString()} (${pct}%)`);
        }
      }

      if (artistBuf.length) {
        upsertBatch(db, artistBuf, albumBuf, trackBuf, playBuf);
      }

      await write(`\n✓ Done! Imported ${count.toLocaleString()} scrobbles.`);
      await write("DONE");
    } catch (err) {
      await write(`\n✗ Error: ${(err as Error).message}`);
    } finally {
      writer.close();
    }
  })();

  return new Response(readable as unknown as ReadableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  });
});

// ─── JSON API ─────────────────────────────────────────────────────────────────

post(/^\/api\/auth\/login$/, async (req, _url, db) => {
  const body = await parseJsonBody(req);
  if (!body) return json({ error: "invalid_json", message: "Invalid JSON request body." }, 400);

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const user = await verifyUserCredentials(db, username, password);
  if (!user) return json({ error: "invalid_credentials", message: "Invalid username or password." }, 401);

  const session = createSession(db, user.id);
  return json({ user, session: { token: session.token, expires_at: session.expiresAt } }, 200, {
    "Set-Cookie": buildSessionCookie(session.token, session.expiresAt),
  });
});

post(/^\/api\/auth\/logout$/, (req, _url, db) => {
  const token = getSessionTokenFromRequest(req);
  if (token) destroySession(db, token);
  return json({ ok: true }, 200, { "Set-Cookie": buildLogoutCookie() });
});

get(/^\/api\/me$/, (req, _url, db) => {
  const user = getAuthenticatedUser(req, db);
  if (!user) return json({ error: "authentication_required", message: "Login required." }, 401);
  return json({ user, nowPlaying: getNowPlaying(db, user.id) });
});

get(/^\/api\/now-playing$/, (_req, _url, db) => json({ nowPlaying: getNowPlaying(db) }));

post(/^\/api\/now-playing$/, async (req, _url, db) => {
  const user = requireApiUser(req, db);
  if (user instanceof Response) return user;

  const body = await parseJsonBody(req);
  if (!body) return json({ error: "invalid_json", message: "Invalid JSON request body." }, 400);
  const artist = typeof body.artist === "string" ? body.artist : "";
  const track = typeof body.track === "string" ? body.track : "";
  if (!artist.trim() || !track.trim()) {
    return json({ error: "validation_error", message: "artist and track are required." }, 400);
  }

  const state = updateNowPlaying(db, user.id, {
    artist,
    track,
    album: typeof body.album === "string" ? body.album : null,
    startedAt: typeof body.startedAt === "string" || typeof body.startedAt === "number" ? body.startedAt : undefined,
    durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : null,
    source: typeof body.source === "string" ? body.source : "api",
    client: typeof body.client === "string" ? body.client : req.headers.get("user-agent") ?? "json-api",
    rawPayload: body,
  });

  return json({ nowPlaying: state });
});

post(/^\/api\/scrobble$/, async (req, _url, db) => {
  const user = requireApiUser(req, db);
  if (user instanceof Response) return user;

  const body = await parseJsonBody(req);
  if (!body) return json({ error: "invalid_json", message: "Invalid JSON request body." }, 400);
  const artist = typeof body.artist === "string" ? body.artist : "";
  const track = typeof body.track === "string" ? body.track : "";
  if (!artist.trim() || !track.trim()) {
    return json({ error: "validation_error", message: "artist and track are required." }, 400);
  }

  const result = insertScrobble(db, {
    artist,
    track,
    album: typeof body.album === "string" ? body.album : null,
    listenedAt: typeof body.listenedAt === "string" || typeof body.listenedAt === "number" ? body.listenedAt : undefined,
    source: typeof body.source === "string" ? body.source : "api",
    client: typeof body.client === "string" ? body.client : req.headers.get("user-agent") ?? "json-api",
    rawPayload: body,
  });

  return json({
    accepted: result.duplicate ? 0 : 1,
    duplicate: result.duplicate,
    scrobble: {
      artist: result.scrobble.artist.name,
      album: result.scrobble.album.title,
      track: result.scrobble.track.title,
      listenedAt: result.scrobble.play.timestamp,
      trackId: result.scrobble.track.id,
    },
    duplicateOf: result.duplicateOf ?? null,
  }, result.duplicate ? 200 : 201);
});

get(/^\/api\/recent$/, (_req, url, db) => {
  const page = Math.max(1, qpInt(url, "page", 1));
  const limit = Math.max(1, Math.min(200, qpInt(url, "limit", DEFAULT_RECENT_LIMIT)));
  const since = parseDateParam(url, "since");
  const until = parseDateParam(url, "until");
  const total = getRecentPlayCount(db, since, until);
  const items = getPlays(db, { limit, offset: (page - 1) * limit, since, until });
  return json({ page, limit, total, totalPages: totalPages(total, limit), items });
});

get(/^\/api\/stats\/overview$/, (_req, url, db) => {
  const since = parseDateParam(url, "since");
  const until = parseDateParam(url, "until");
  return json({
    ...getOverviewStats(db, { since, until }),
    listens_last_7_days: getRecentPlayCount(db, new Date(Date.now() - 7 * 86_400_000), null),
    listens_last_30_days: getRecentPlayCount(db, new Date(Date.now() - 30 * 86_400_000), null),
    listens_last_year: getRecentPlayCount(db, new Date(Date.now() - 365 * 86_400_000), null),
    streak: getListeningStreak(db),
    now_playing: getNowPlaying(db),
  });
});

get(/^\/api\/stats\/top-artists$/, (_req, url, db) => {
  const since = parseDateParam(url, "since");
  const until = parseDateParam(url, "until");
  const limit = Math.max(1, Math.min(200, qpInt(url, "limit", 25)));
  return json(getTopArtists(db, { limit, since, until }));
});

get(/^\/api\/stats\/top-albums$/, (_req, url, db) => {
  const since = parseDateParam(url, "since");
  const until = parseDateParam(url, "until");
  const limit = Math.max(1, Math.min(200, qpInt(url, "limit", 25)));
  return json(getTopAlbums(db, { limit, since, until }));
});

get(/^\/api\/stats\/top-tracks$/, (_req, url, db) => {
  const since = parseDateParam(url, "since");
  const until = parseDateParam(url, "until");
  const limit = Math.max(1, Math.min(200, qpInt(url, "limit", 25)));
  return json(getTopTracks(db, { limit, since, until }));
});

get(/^\/api\/artists\/([^/]+)$/, (_req, _url, db, match) => {
  const id = decodeURIComponent(match[1] ?? "");
  const artist = getArtistDetailRecord(db, id);
  if (!artist) return json({ error: "not_found", message: "Artist not found." }, 404);
  return json({
    artist,
    topTracks: getTracks(db, { artistId: id, limit: 20, sortBy: "plays", order: "desc" }),
    albums: getAlbums(db, { artistId: id, limit: 50, sortBy: "plays", order: "desc" }),
  });
});

get(/^\/api\/albums\/([^/]+)$/, (_req, _url, db, match) => {
  const id = decodeURIComponent(match[1] ?? "");
  const album = getAlbumDetailRecord(db, id);
  if (!album) return json({ error: "not_found", message: "Album not found." }, 404);
  return json({
    album,
    tracks: getTracks(db, { albumId: id, limit: 200, sortBy: "title", order: "asc" }),
  });
});

get(/^\/api\/tracks\/([^/]+)$/, (_req, _url, db, match) => {
  const id = decodeURIComponent(match[1] ?? "");
  const track = getTrackDetailRecord(db, id);
  if (!track) return json({ error: "not_found", message: "Track not found." }, 404);
  return json({
    track,
    recentPlays: getPlays(db, { trackId: id, limit: 50 }),
  });
});

get(/^\/api\/stats$/, (_req, _url, db) => json(getOverviewStats(db)));
get(/^\/api\/artists$/, (_req, url, db) => json(getArtists(db, { limit: qpInt(url, "limit", 50) })));
get(/^\/api\/albums$/, (_req, url, db) => json(getAlbums(db, { limit: qpInt(url, "limit", 50) })));
get(/^\/api\/tracks$/, (_req, url, db) => json(getTracks(db, { limit: qpInt(url, "limit", 50) })));
get(/^\/api\/plays$/, (_req, url, db) => json(getPlays(db, { limit: qpInt(url, "limit", 50) })));
get(/^\/api\/search$/, (_req, url, db) => {
  const query = qp(url, "q", "").trim();
  if (!query) return json({ error: "query param q is required" }, 400);
  return json(searchTracks(db, query, qpInt(url, "limit", 50)));
});

// ─── Artist Universe Map ──────────────────────────────────────────────────────

get(/^\/universe$/, (_req, _url, db) => {
  const graph = getArtistGraph(db, 80);
  return html(renderUniverse(JSON.stringify(graph), graph.nodes.length, graph.edges.length));
});

get(/^\/api\/universe$/, (_req, url, db) => json(getArtistGraph(db, qpInt(url, "limit", 80))));

// ─── Timeline heatmap ─────────────────────────────────────────────────────────

get(/^\/timeline$/, (_req, _url, db) => html(renderTimeline(JSON.stringify(getDailyHeatmap(db, 2)))));
get(/^\/api\/heatmap$/, (_req, url, db) => json(getDailyHeatmap(db, qpInt(url, "years", 2))));

// ─── Taste DNA ────────────────────────────────────────────────────────────────

get(/^\/taste$/, (_req, _url, db) => html(renderTaste(getTasteDrift(db))));
get(/^\/api\/taste$/, (_req, _url, db) => json(getTasteDrift(db)));

// ─── Yearly Wrapped ───────────────────────────────────────────────────────────

get(/^\/wrapped$/, (_req, url, db) => {
  const years = getWrappedYears(db);
  if (years.length === 0) return html(renderWrapped(null, 0, []));
  const year = qpInt(url, "year", years[0]!);
  return html(renderWrapped(getWrappedYear(db, year), year, years));
});

get(/^\/api\/wrapped$/, (_req, url, db) => {
  const years = getWrappedYears(db);
  if (years.length === 0) return json({ year: null, years: [], data: null });
  const year = qpInt(url, "year", years[0]!);
  return json({ year, years, data: getWrappedYear(db, year) });
});

// ─── ListenBrainz-compatible layer ────────────────────────────────────────────

get(/^\/1\/validate-token\/?$/, (req, _url, db) => handleListenBrainzValidateToken(req, db));
post(/^\/1\/submit-listens\/?$/, (req, _url, db) => handleListenBrainzSubmit(req, db));
get(/^\/1\/user\/([^/]+)\/listens\/?$/, (_req, url, db, match) => handleListenBrainzListens(url, db, decodeURIComponent(match[1] ?? "")));
get(/^\/1\/user\/([^/]+)\/listen-count\/?$/, (_req, _url, db, match) => handleListenBrainzListenCount(db, decodeURIComponent(match[1] ?? "")));
get(/^\/1\/user\/([^/]+)\/playing-now\/?$/, (_req, _url, db, match) => handleListenBrainzPlayingNow(db, decodeURIComponent(match[1] ?? "")));

// ─── Last.fm-compatible compatibility layer ───────────────────────────────────

get(/^\/2\.0\/?$/, (req, url, db) => handleCompatibilityRequest(req, url, db));
post(/^\/2\.0\/?$/, (req, url, db) => handleCompatibilityRequest(req, url, db));
get(/^\/compat\/2\.0\/?$/, (req, url, db) => handleCompatibilityRequest(req, url, db));
post(/^\/compat\/2\.0\/?$/, (req, url, db) => handleCompatibilityRequest(req, url, db));
