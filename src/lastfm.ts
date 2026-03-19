/**
 * Last.fm, Libre.fm, and ScrobbleVault compatibility API client.
 *
 * Uses Bun-native APIs exclusively:
 *   - Bun.CryptoHasher  for MD5 (no "crypto" module)
 *   - fetch()           for HTTP (Bun's built-in)
 *   - Bun.sleep()       for retry back-off
 */

import { resolveNetworkApiUrl, type NetworkName } from "./config";
import type { ArtistRow, AlbumRow, TrackRow, PlayRow } from "./db";

// ─── Client identity ──────────────────────────────────────────────────────────

/**
 * Sent as the User-Agent on every request to Last.fm and Libre.fm.
 * An identifiable User-Agent is required to avoid being mistaken for an
 * automated scraper — Libre.fm explicitly blocks anything that looks like one.
 * See: https://github.com/libre-fm/developer/wiki/Libre.fm-fundamentals#ai-policy
 */
const USER_AGENT = "ScrobbleVault/2.0 (https://github.com/shelbeely/ScrobbleVault)";

// ─── Crypto (Bun-native) ──────────────────────────────────────────────────────

/** MD5-hash a UTF-8 string and return the lowercase hex digest. */
export function md5(input: string): string {
  return new Bun.CryptoHasher("md5").update(input).digest("hex");
}

/** Build an API call signature as required by the Last.fm auth spec. */
function buildApiSig(params: Record<string, string>, secret: string): string {
  const raw = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("") + secret;
  return md5(raw);
}

interface NetworkRequestOptions {
  baseUrl?: string;
}

function networkUrl(network: NetworkName, options?: NetworkRequestOptions): string {
  return resolveNetworkApiUrl(network, options?.baseUrl);
}

// ─── Session key generation ───────────────────────────────────────────────────

/**
 * Obtain a session key via the `auth.getMobileSession` method.
 * ScrobbleVault's compatibility layer accepts the same request shape but does
 * not require callers to register their own API key and shared secret.
 */
export async function getSessionKey(
  network: NetworkName,
  apiKey: string,
  secret: string,
  username: string,
  password: string,
  options?: NetworkRequestOptions,
): Promise<string> {
  const params: Record<string, string> = {
    method: "auth.getMobileSession",
    username,
    password: md5(password),
    api_key: apiKey,
  };
  params.api_sig = buildApiSig(params, secret);
  params.format = "json";

  const res = await fetch(networkUrl(network, options), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams(params).toString(),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} from ${network} auth endpoint`);

  const data = (await res.json()) as {
    session?: { key: string };
    error?: number;
    message?: string;
  };

  if (data.error) throw new Error(`${network} API error ${data.error}: ${data.message}`);

  const key = data.session?.key;
  if (!key) throw new Error(`No session key returned by ${network}`);
  return key;
}

// ─── API request helper ───────────────────────────────────────────────────────

const MAX_RETRIES = 5;

interface RecentTracksResponse {
  recenttracks?: {
    "@attr"?: { totalPages?: string; total?: string; perPage?: string };
    track?: RawTrack | RawTrack[];
  };
  error?: number;
  message?: string;
}

interface RawTrack {
  name?: string;
  mbid?: string;
  "@attr"?: { nowplaying?: string };
  date?: { uts?: string };
  artist?: { "#text"?: string; mbid?: string };
  album?: { "#text"?: string; mbid?: string };
}

/** GET request to the network API with exponential-backoff retry. */
async function apiGet(
  network: NetworkName,
  apiKey: string,
  sessionKey: string,
  params: Record<string, string>,
  options?: NetworkRequestOptions,
  retries = MAX_RETRIES,
): Promise<unknown> {
  const url = new URL(networkUrl(network, options));
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("sk", sessionKey);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  let lastErr: Error | null = null;
  let wait = 1_000;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { error?: number; message?: string };
      if (data.error) throw new Error(`${network} API error ${data.error}: ${data.message}`);
      return data;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await Bun.sleep(wait + Math.random() * 500);
        wait = Math.min(wait * 2, 16_000);
      }
    }
  }

  throw lastErr ?? new Error("Unknown API error");
}

// ─── Track count ─────────────────────────────────────────────────────────────

export async function getRecentTracksCount(
  network: NetworkName,
  apiKey: string,
  sessionKey: string,
  username: string,
  since?: Date,
  until?: Date,
  options?: NetworkRequestOptions,
): Promise<number> {
  const params: Record<string, string> = {
    method: "user.getRecentTracks",
    user: username,
    limit: "1",
    page: "1",
  };
  if (since) params.from = String(Math.floor(since.getTime() / 1_000));
  if (until) params.to = String(Math.floor(until.getTime() / 1_000));

  try {
    const data = (await apiGet(network, apiKey, sessionKey, params, options)) as RecentTracksResponse;
    const total = parseInt(data.recenttracks?.["@attr"]?.total ?? "0", 10);
    return Number.isNaN(total) ? 0 : total;
  } catch {
    return 0;
  }
}

// ─── Scrobble data ────────────────────────────────────────────────────────────

export interface ScrobbleData {
  artist: ArtistRow;
  album: AlbumRow;
  track: TrackRow;
  play: PlayRow;
}

/** Derive a deterministic synthetic ID from a string using MD5. */
function syntheticId(input: string): string {
  return "md5:" + md5(input);
}

/** Parse one raw API track node into DB-ready data. Returns null for "now playing" entries. */
function extractTrackData(raw: RawTrack): ScrobbleData | null {
  if (raw["@attr"]?.nowplaying === "true") return null;

  const uts = raw.date?.uts;
  if (!uts) return null;

  const timestamp = new Date(parseInt(uts, 10) * 1_000).toISOString();
  const trackTitle = raw.name ?? "(unknown track)";
  const trackMbid = raw.mbid ?? "";
  const artistName = raw.artist?.["#text"] ?? "(unknown artist)";
  const artistMbid = raw.artist?.mbid || syntheticId(artistName);
  const albumTitle = raw.album?.["#text"] || "(single)";
  const albumMbid = raw.album?.mbid || syntheticId(artistMbid + albumTitle);
  const trackId = trackMbid || syntheticId(albumMbid + trackTitle);

  return {
    artist: { id: artistMbid, name: artistName },
    album: { id: albumMbid, title: albumTitle, artist_id: artistMbid },
    track: { id: trackId, title: trackTitle, album_id: albumMbid },
    play: { timestamp, track_id: trackId },
  };
}

/**
 * Async generator that yields scrobbles page-by-page.
 * ScrobbleVault reuses the same response shape on its compatibility endpoint,
 * so the importer can treat it like another network.
 */
export async function* recentTracks(
  network: NetworkName,
  apiKey: string,
  sessionKey: string,
  username: string,
  options: NetworkRequestOptions & {
    since?: Date;
    until?: Date;
    limit?: number;
    pageSize?: number;
  } = {},
): AsyncGenerator<ScrobbleData> {
  const { since, until, limit, pageSize = 200, baseUrl } = options;

  const params: Record<string, string> = {
    method: "user.getRecentTracks",
    user: username,
    limit: String(pageSize),
  };
  if (since) params.from = String(Math.floor(since.getTime() / 1_000));
  if (until) params.to = String(Math.floor(until.getTime() / 1_000));

  let page = 1;
  let totalPages = Infinity;
  let yielded = 0;

  while (page <= totalPages) {
    params.page = String(page);

    const data = (await apiGet(network, apiKey, sessionKey, params, { baseUrl })) as RecentTracksResponse;
    const attr = data.recenttracks?.["@attr"];

    if (page === 1 && attr?.totalPages) {
      const totalPagesValue = parseInt(attr.totalPages, 10);
      totalPages = Number.isNaN(totalPagesValue) || totalPagesValue < 1 ? 1 : totalPagesValue;
    }

    const rawTracks = data.recenttracks?.track ?? [];
    const tracks = Array.isArray(rawTracks) ? rawTracks : [rawTracks];

    for (const raw of tracks) {
      const scrobble = extractTrackData(raw);
      if (!scrobble) continue;
      yield scrobble;
      yielded++;
      if (limit && yielded >= limit) return;
    }

    page++;
  }
}
