import type { Database } from "bun:sqlite";

import type { AlbumRow, ArtistRow, PlayRow, TrackRow } from "./db";
import { upsertBatch, upsertPlayMetadata } from "./db";

const UNKNOWN_ARTIST = "(unknown artist)";
const UNKNOWN_TRACK = "(unknown track)";
const SINGLE_RELEASE = "(single)";
const DEFAULT_DUPLICATE_WINDOW_SECONDS = Math.max(
  0,
  parseInt(Bun.env.SCROBBLEVAULT_DUPLICATE_WINDOW_SECONDS ?? "180", 10) || 180,
);

export interface IncomingScrobbleInput {
  artist: string;
  track: string;
  album?: string | null;
  listenedAt?: Date | string | number | null;
  source?: string | null;
  client?: string | null;
  rawPayload?: unknown;
}

export interface IncomingNowPlayingInput {
  artist: string;
  track: string;
  album?: string | null;
  startedAt?: Date | string | number | null;
  durationSeconds?: number | null;
  source?: string | null;
  client?: string | null;
  rawPayload?: unknown;
}

export interface PreparedScrobble {
  artist: ArtistRow;
  album: AlbumRow;
  track: TrackRow;
  play: PlayRow;
  artistKey: string;
  albumKey: string;
  trackKey: string;
  source: string | null;
  client: string | null;
  rawPayload: string | null;
}

export interface ScrobbleInsertResult {
  duplicate: boolean;
  scrobble: PreparedScrobble;
  duplicateOf?: { timestamp: string; track_id: string };
}

export interface NowPlayingStatus {
  user_id: number;
  artist_name: string;
  album_title: string | null;
  track_title: string;
  started_at: string;
  duration_seconds: number | null;
  source: string | null;
  client: string | null;
  updated_at: string;
}

function stableId(namespace: string, key: string): string {
  return `${namespace}:${new Bun.CryptoHasher("sha256").update(key).digest("hex").slice(0, 32)}`;
}

function normalizeDateInput(value: Date | string | number | null | undefined, fallback = new Date()): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const millis = value > 10_000_000_000 ? value : value * 1_000;
    return new Date(millis);
  }
  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) return normalizeDateInput(asNumber, fallback);
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function rawToJson(value: unknown): string | null {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function normalizeText(input: string): string {
  return input.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function makeLookupKey(input: string): string {
  return normalizeText(input).toLocaleLowerCase();
}

export function normalizeArtistName(input: string): string {
  const normalized = normalizeText(input);
  return normalized || UNKNOWN_ARTIST;
}

export function normalizeAlbumTitle(input: string | null | undefined): string {
  const normalized = normalizeText(input ?? "");
  return normalized || SINGLE_RELEASE;
}

export function normalizeTrackTitle(input: string): string {
  const normalized = normalizeText(input);
  return normalized || UNKNOWN_TRACK;
}

export function prepareScrobble(input: IncomingScrobbleInput): PreparedScrobble {
  const artistName = normalizeArtistName(input.artist);
  const albumTitle = normalizeAlbumTitle(input.album);
  const trackTitle = normalizeTrackTitle(input.track);
  const listenedAt = normalizeDateInput(input.listenedAt).toISOString();

  const artistKey = makeLookupKey(artistName);
  const albumKey = makeLookupKey(albumTitle);
  const trackKey = makeLookupKey(trackTitle);

  const artistId = stableId("artist", artistKey);
  const albumId = stableId("album", `${artistKey}\u0000${albumKey}`);
  const trackId = stableId("track", `${artistKey}\u0000${albumKey}\u0000${trackKey}`);

  return {
    artist: { id: artistId, name: artistName },
    album: { id: albumId, title: albumTitle, artist_id: artistId },
    track: { id: trackId, title: trackTitle, album_id: albumId },
    play: { timestamp: listenedAt, track_id: trackId },
    artistKey,
    albumKey,
    trackKey,
    source: input.source?.trim() || null,
    client: input.client?.trim() || null,
    rawPayload: rawToJson(input.rawPayload),
  };
}

function findDuplicateCandidate(
  db: Database,
  prepared: PreparedScrobble,
  duplicateWindowSeconds = DEFAULT_DUPLICATE_WINDOW_SECONDS,
): { timestamp: string; track_id: string } | null {
  if (duplicateWindowSeconds <= 0) return null;

  const listenedAt = new Date(prepared.play.timestamp).getTime();
  const since = new Date(listenedAt - duplicateWindowSeconds * 1_000).toISOString();
  const until = new Date(listenedAt + duplicateWindowSeconds * 1_000).toISOString();

  const rows = db.prepare(
    `SELECT plays.timestamp, plays.track_id, tracks.title AS track_title,
            albums.title AS album_title, artists.name AS artist_name
     FROM plays
     JOIN tracks ON plays.track_id = tracks.id
     JOIN albums ON tracks.album_id = albums.id
     JOIN artists ON albums.artist_id = artists.id
     WHERE plays.timestamp >= ? AND plays.timestamp <= ?
     ORDER BY plays.timestamp DESC`,
  ).all(since, until) as Array<{
    timestamp: string;
    track_id: string;
    track_title: string;
    album_title: string;
    artist_name: string;
  }>;

  for (const row of rows) {
    if (makeLookupKey(row.artist_name) !== prepared.artistKey) continue;
    if (makeLookupKey(row.track_title) !== prepared.trackKey) continue;
    if (prepared.album.title !== SINGLE_RELEASE && makeLookupKey(row.album_title) !== prepared.albumKey) continue;
    return { timestamp: row.timestamp, track_id: row.track_id };
  }

  return null;
}

export function insertScrobble(
  db: Database,
  input: IncomingScrobbleInput,
  duplicateWindowSeconds = DEFAULT_DUPLICATE_WINDOW_SECONDS,
): ScrobbleInsertResult {
  const prepared = prepareScrobble(input);
  const duplicate = findDuplicateCandidate(db, prepared, duplicateWindowSeconds);

  if (duplicate) {
    return { duplicate: true, duplicateOf: duplicate, scrobble: prepared };
  }

  upsertBatch(db, [prepared.artist], [prepared.album], [prepared.track], [prepared.play]);
  upsertPlayMetadata(db, {
    timestamp: prepared.play.timestamp,
    track_id: prepared.play.track_id,
    source: prepared.source,
    client: prepared.client,
    raw_payload: prepared.rawPayload,
  });

  return { duplicate: false, scrobble: prepared };
}

export function updateNowPlaying(db: Database, userId: number, input: IncomingNowPlayingInput): NowPlayingStatus {
  const artistName = normalizeArtistName(input.artist);
  const albumTitle = input.album != null && normalizeText(input.album) ? normalizeAlbumTitle(input.album) : null;
  const trackTitle = normalizeTrackTitle(input.track);
  const startedAt = normalizeDateInput(input.startedAt).toISOString();
  const updatedAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO now_playing (
        user_id, artist_name, artist_key, album_title, album_key,
        track_title, track_key, started_at, duration_seconds,
        source, client, raw_payload, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        artist_name = excluded.artist_name,
        artist_key = excluded.artist_key,
        album_title = excluded.album_title,
        album_key = excluded.album_key,
        track_title = excluded.track_title,
        track_key = excluded.track_key,
        started_at = excluded.started_at,
        duration_seconds = excluded.duration_seconds,
        source = excluded.source,
        client = excluded.client,
        raw_payload = excluded.raw_payload,
        updated_at = excluded.updated_at`,
  ).run(
    userId,
    artistName,
    makeLookupKey(artistName),
    albumTitle,
    albumTitle ? makeLookupKey(albumTitle) : null,
    trackTitle,
    makeLookupKey(trackTitle),
    startedAt,
    input.durationSeconds ?? null,
    input.source?.trim() || null,
    input.client?.trim() || null,
    rawToJson(input.rawPayload),
    updatedAt,
  );

  return getNowPlaying(db, userId)!;
}

export function getNowPlaying(db: Database, userId = 1): NowPlayingStatus | null {
  const row = db.prepare(
    `SELECT user_id, artist_name, album_title, track_title, started_at,
            duration_seconds, source, client, updated_at
     FROM now_playing
     WHERE user_id = ?`,
  ).get(userId) as NowPlayingStatus | null;

  return row ?? null;
}
