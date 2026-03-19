/**
 * HTTP route handlers for the scrobbledb web app.
 *
 * Each handler receives the parsed URL and request, performs DB queries
 * (or API calls for ingest), and returns a Response.
 */

import type { Database } from "bun:sqlite";
import {
  getOverviewStats,
  getMonthlyRollup,
  getYearlyRollup,
  getArtists,
  getTopArtists,
  getAlbums,
  getTracks,
  getPlays,
  searchTracks,
  parseRelativeDate,
  getListeningStreak,
  getScrobblesThisYear,
  getScrobblesThisMonth,
  getDailyHeatmap,
  getArtistGraph,
  getTasteDrift,
  getWrappedYears,
  getWrappedYear,
} from "../queries";
import { initSchema, setupFts5, upsertBatch, getLatestTimestamp } from "../db";
import { recentTracks, getRecentTracksCount } from "../lastfm";
import { loadAuth, saveAuth, getDefaultAuthPath, type NetworkName } from "../config";
import { getSessionKey } from "../lastfm";
import {
  renderDashboard,
  renderArtists,
  renderArtistDetail,
  renderAlbums,
  renderAlbumDetail,
  renderTracks,
  renderTrackDetail,
  renderPlays,
  renderStats,
  renderSearch,
  renderSettings,
  renderIngest,
  renderUniverse,
  renderTimeline,
  renderTaste,
  renderWrapped,
} from "./templates";

const PAGE_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function redirect(to: string): Response {
  return new Response(null, { status: 302, headers: { Location: to } });
}

function qp(url: URL, name: string, fallback: string): string {
  return url.searchParams.get(name) ?? fallback;
}

function qpInt(url: URL, name: string, fallback: number): number {
  const v = url.searchParams.get(name);
  const n = v ? parseInt(v, 10) : NaN;
  return isNaN(n) ? fallback : n;
}

/** Parse a form body from a POST request. */
async function parseForm(req: Request): Promise<URLSearchParams> {
  const text = await req.text();
  return new URLSearchParams(text);
}

/** Total number of pages for a given count and page size. */
function totalPages(count: number, size: number): number {
  return Math.max(1, Math.ceil(count / size));
}

// ─── Route registry ───────────────────────────────────────────────────────────

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

// ─── Brain (enhanced dashboard) ──────────────────────────────────────────────

get(/^\/$/, (_req, _url, db) => {
  const stats      = getOverviewStats(db);
  const topArtists = getTopArtists(db, { limit: 10 });
  const streak     = getListeningStreak(db);
  const thisYear   = getScrobblesThisYear(db);
  const thisMonth  = getScrobblesThisMonth(db);
  return html(renderDashboard(
    stats as unknown as Record<string, unknown>,
    topArtists as unknown as Record<string, unknown>[],
    streak,
    thisYear,
    thisMonth,
  ));
});

// ─── Artists ─────────────────────────────────────────────────────────────────

get(/^\/artists$/, (_req, url, db) => {
  const page = qpInt(url, "page", 1);
  const sort = qp(url, "sort", "plays") as "plays" | "name" | "recent";
  const order = qp(url, "order", "desc") as "asc" | "desc";
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
  const artists = getArtists(db, { limit: 1, search: undefined });
  // Lookup by ID directly
  const artist = db.query(
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
    GROUP BY artists.id`
  ).get(id) as Record<string, unknown> | null;

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
  const page = qpInt(url, "page", 1);
  const sort = qp(url, "sort", "plays") as "plays" | "title" | "recent";
  const order = qp(url, "order", "desc") as "asc" | "desc";
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
  const album = db.query(
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
    GROUP BY albums.id`
  ).get(id) as Record<string, unknown> | null;

  if (!album) return html("<h1>Album not found</h1>", 404);

  const tracks = getTracks(db, { albumId: id, limit: 200, sortBy: "title", order: "asc" });
  return html(renderAlbumDetail(album, tracks as unknown as Record<string, unknown>[]));
});

// ─── Tracks ───────────────────────────────────────────────────────────────────

get(/^\/tracks$/, (_req, url, db) => {
  const page = qpInt(url, "page", 1);
  const sort = qp(url, "sort", "plays") as "plays" | "title" | "recent";
  const order = qp(url, "order", "desc") as "asc" | "desc";
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
  const track = db.query(
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
    GROUP BY tracks.id`
  ).get(id) as Record<string, unknown> | null;

  if (!track) return html("<h1>Track not found</h1>", 404);

  const plays = getPlays(db, { trackId: id, limit: 200 });
  return html(renderTrackDetail(track, plays as unknown as Record<string, unknown>[]));
});

// ─── Plays ────────────────────────────────────────────────────────────────────

get(/^\/plays$/, (_req, url, db) => {
  const page = qpInt(url, "page", 1);
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
  const q = qp(url, "q", "").trim();
  const results = q ? searchTracks(db, q, 100) : [];
  return html(renderSearch(q, results as unknown as Record<string, unknown>[]));
});

// ─── Settings ─────────────────────────────────────────────────────────────────

get(/^\/settings$/, () => {
  const auth = loadAuth();
  return html(renderSettings({
    network: auth?.lastfm_network ?? "lastfm",
    username: auth?.lastfm_username ?? "",
    hasCredentials: !!auth?.lastfm_session_key,
  }));
});

post(/^\/settings\/auth$/, async (req) => {
  const form = await parseForm(req);
  const network = (form.get("network") ?? "lastfm") as NetworkName;
  const username = form.get("username")?.trim() ?? "";
  const apiKey = form.get("api_key")?.trim() ?? "";
  const secret = form.get("shared_secret")?.trim() ?? "";
  const password = form.get("password") ?? "";

  if (!username || !apiKey || !secret || !password) {
    return html(renderSettings(
      { network, username, hasCredentials: false },
      { type: "error", message: "All fields are required." },
    ));
  }

  try {
    const sessionKey = await getSessionKey(network, apiKey, secret, username, password);
    await saveAuth({ lastfm_network: network, lastfm_username: username,
                     lastfm_api_key: apiKey, lastfm_shared_secret: secret,
                     lastfm_session_key: sessionKey });
    return html(renderSettings(
      { network, username, hasCredentials: true },
      { type: "success", message: `✓ Authenticated as ${username} on ${network === "librefm" ? "Libre.fm" : "Last.fm"}.` },
    ));
  } catch (err) {
    return html(renderSettings(
      { network, username, hasCredentials: false },
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

  // Ensure schema is ready
  initSchema(db);
  setupFts5(db);

  // Streaming response so the browser can show live progress
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  const write = (line: string) => writer.write(enc.encode(line + "\n"));

  // Run ingest in background, stream progress to client
  (async () => {
    try {
      const { lastfm_network: network, lastfm_username: username,
              lastfm_api_key: apiKey, lastfm_shared_secret: secret,
              lastfm_session_key: sessionKey } = auth;

      const latestTs = getLatestTimestamp(db);
      const sinceDate = since ?? (latestTs ? new Date(latestTs) : undefined);

      await write(`Checking ${network === "librefm" ? "Libre.fm" : "Last.fm"} for new scrobbles…`);

      const total = await getRecentTracksCount(network, apiKey, sessionKey, username,
                                               sinceDate ?? undefined, until ?? undefined);
      const expected = limit ? Math.min(limit, total) : total;
      await write(`Found ${expected.toLocaleString()} scrobble(s) to import.`);

      if (expected === 0) { await write("Nothing to import."); return; }

      let count = 0;
      const artistBuf: Parameters<typeof upsertBatch>[1] = [];
      const albumBuf:  Parameters<typeof upsertBatch>[2] = [];
      const trackBuf:  Parameters<typeof upsertBatch>[3] = [];
      const playBuf:   Parameters<typeof upsertBatch>[4] = [];
      const BATCH = 200;

      for await (const s of recentTracks(network, apiKey, sessionKey, username,
                                         { since: sinceDate ?? undefined, until: until ?? undefined,
                                           limit, pageSize: BATCH })) {
        artistBuf.push(s.artist);
        albumBuf.push(s.album);
        trackBuf.push(s.track);
        playBuf.push(s.play);
        count++;

        if (artistBuf.length >= BATCH) {
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
      await write(`DONE`);
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

get(/^\/api\/stats$/, (_req, _url, db) => json(getOverviewStats(db)));
get(/^\/api\/artists$/, (_req, url, db) => {
  const limit = qpInt(url, "limit", 50);
  return json(getArtists(db, { limit }));
});
get(/^\/api\/albums$/, (_req, url, db) => {
  const limit = qpInt(url, "limit", 50);
  return json(getAlbums(db, { limit }));
});
get(/^\/api\/tracks$/, (_req, url, db) => {
  const limit = qpInt(url, "limit", 50);
  return json(getTracks(db, { limit }));
});
get(/^\/api\/plays$/, (_req, url, db) => {
  const limit = qpInt(url, "limit", 50);
  return json(getPlays(db, { limit }));
});
get(/^\/api\/search$/, (_req, url, db) => {
  const q = qp(url, "q", "").trim();
  if (!q) return json({ error: "query param q is required" }, 400);
  return json(searchTracks(db, q, qpInt(url, "limit", 50)));
});

// ─── Artist Universe Map ──────────────────────────────────────────────────────

get(/^\/universe$/, (_req, _url, db) => {
  const graph = getArtistGraph(db, 80);
  return html(renderUniverse(JSON.stringify(graph), graph.nodes.length, graph.edges.length));
});

get(/^\/api\/universe$/, (_req, url, db) => {
  const limit = qpInt(url, "limit", 80);
  return json(getArtistGraph(db, limit));
});

// ─── Timeline heatmap ─────────────────────────────────────────────────────────

get(/^\/timeline$/, (_req, _url, db) => {
  const heatmap = getDailyHeatmap(db, 2);
  return html(renderTimeline(JSON.stringify(heatmap)));
});

get(/^\/api\/heatmap$/, (_req, url, db) => {
  const years = qpInt(url, "years", 2);
  return json(getDailyHeatmap(db, years));
});

// ─── Taste DNA ────────────────────────────────────────────────────────────────

get(/^\/taste$/, (_req, _url, db) => {
  const drift = getTasteDrift(db);
  return html(renderTaste(drift));
});

get(/^\/api\/taste$/, (_req, _url, db) => {
  return json(getTasteDrift(db));
});

// ─── Yearly Wrapped ───────────────────────────────────────────────────────────

get(/^\/wrapped$/, (_req, url, db) => {
  const years = getWrappedYears(db);
  if (years.length === 0) {
    // No scrobble data at all — render empty state with no year selected
    return html(renderWrapped(null, 0, []));
  }
  const year = qpInt(url, "year", years[0]!);
  return html(renderWrapped(getWrappedYear(db, year), year, years));
});

get(/^\/api\/wrapped$/, (_req, url, db) => {
  const years = getWrappedYears(db);
  if (years.length === 0) return json({ year: null, years: [], data: null });
  const year = qpInt(url, "year", years[0]!);
  return json({ year, years, data: getWrappedYear(db, year) });
});
