import type { IncomingNowPlayingInput, IncomingScrobbleInput, NowPlayingStatus } from "./scrobble";

interface ListenBrainzAdditionalInfo {
  duration_ms?: unknown;
  duration?: unknown;
  submission_client?: unknown;
  media_player?: unknown;
  music_service?: unknown;
  music_service_name?: unknown;
  [key: string]: unknown;
}

interface ListenBrainzTrackMetadata {
  artist_name?: unknown;
  track_name?: unknown;
  release_name?: unknown;
  additional_info?: ListenBrainzAdditionalInfo;
}

export interface ListenBrainzListen {
  listened_at?: unknown;
  inserted_at?: unknown;
  track_metadata?: ListenBrainzTrackMetadata;
}

export interface ListenBrainzSubmitBody {
  listen_type?: unknown;
  payload?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getTrackMetadata(listen: ListenBrainzListen): ListenBrainzTrackMetadata | null {
  return isRecord(listen.track_metadata) ? (listen.track_metadata as ListenBrainzTrackMetadata) : null;
}

function getAdditionalInfo(metadata: ListenBrainzTrackMetadata | null): ListenBrainzAdditionalInfo | null {
  return metadata && isRecord(metadata.additional_info) ? (metadata.additional_info as ListenBrainzAdditionalInfo) : null;
}

function clientFromAdditionalInfo(additionalInfo: ListenBrainzAdditionalInfo | null, fallback: string): string {
  return asString(additionalInfo?.submission_client)
    ?? asString(additionalInfo?.media_player)
    ?? fallback;
}

function sourceFromAdditionalInfo(additionalInfo: ListenBrainzAdditionalInfo | null): string {
  return asString(additionalInfo?.music_service)
    ?? asString(additionalInfo?.music_service_name)
    ?? "listenbrainz";
}

function durationSecondsFromAdditionalInfo(additionalInfo: ListenBrainzAdditionalInfo | null): number | null {
  const durationMs = asNumber(additionalInfo?.duration_ms);
  if (durationMs != null) return Math.max(0, Math.round(durationMs / 1000));
  const duration = asNumber(additionalInfo?.duration);
  return duration != null ? Math.max(0, Math.round(duration)) : null;
}

export function parseListenBrainzSubmitBody(body: Record<string, unknown> | null): {
  listenType: "single" | "playing_now" | "import";
  payload: ListenBrainzListen[];
} | null {
  if (!body) return null;
  const listenTypeRaw = asString((body as ListenBrainzSubmitBody).listen_type);
  const payloadRaw = (body as ListenBrainzSubmitBody).payload;
  if (!listenTypeRaw || !Array.isArray(payloadRaw)) return null;
  if (listenTypeRaw !== "single" && listenTypeRaw !== "playing_now" && listenTypeRaw !== "import") return null;

  return {
    listenType: listenTypeRaw,
    payload: payloadRaw.filter(isRecord) as ListenBrainzListen[],
  };
}

export function listenBrainzNowPlayingInput(
  listen: ListenBrainzListen,
  userAgent: string,
): IncomingNowPlayingInput | null {
  const metadata = getTrackMetadata(listen);
  const additionalInfo = getAdditionalInfo(metadata);
  const artist = asString(metadata?.artist_name);
  const track = asString(metadata?.track_name);
  if (!artist || !track) return null;

  return {
    artist,
    track,
    album: asString(metadata?.release_name),
    durationSeconds: durationSecondsFromAdditionalInfo(additionalInfo),
    source: sourceFromAdditionalInfo(additionalInfo),
    client: clientFromAdditionalInfo(additionalInfo, userAgent),
    rawPayload: listen,
  };
}

export function listenBrainzScrobbleInput(
  listen: ListenBrainzListen,
  userAgent: string,
): IncomingScrobbleInput | null {
  const metadata = getTrackMetadata(listen);
  const additionalInfo = getAdditionalInfo(metadata);
  const artist = asString(metadata?.artist_name);
  const track = asString(metadata?.track_name);
  const listenedAt = asNumber(listen.listened_at);
  if (!artist || !track || listenedAt == null) return null;

  return {
    artist,
    track,
    album: asString(metadata?.release_name),
    listenedAt,
    source: sourceFromAdditionalInfo(additionalInfo),
    client: clientFromAdditionalInfo(additionalInfo, userAgent),
    rawPayload: listen,
  };
}

export function formatListenBrainzListen(row: {
  timestamp: string;
  track_title: string;
  album_title: string;
  artist_name: string;
  source?: string | null;
  client?: string | null;
}): Record<string, unknown> {
  const additionalInfo: Record<string, unknown> = {};
  if (row.client) additionalInfo.submission_client = row.client;
  if (row.source) additionalInfo.music_service = row.source;

  return {
    listened_at: Math.floor(new Date(row.timestamp).getTime() / 1000),
    track_metadata: {
      artist_name: row.artist_name,
      track_name: row.track_title,
      release_name: row.album_title === "(single)" ? "" : row.album_title,
      additional_info: additionalInfo,
    },
  };
}

export function formatListenBrainzPlayingNow(nowPlaying: NowPlayingStatus): Record<string, unknown> {
  const additionalInfo: Record<string, unknown> = {};
  if (nowPlaying.client) additionalInfo.submission_client = nowPlaying.client;
  if (nowPlaying.source) additionalInfo.music_service = nowPlaying.source;
  if (nowPlaying.duration_seconds != null) additionalInfo.duration = nowPlaying.duration_seconds;

  return {
    track_metadata: {
      artist_name: nowPlaying.artist_name,
      track_name: nowPlaying.track_title,
      release_name: nowPlaying.album_title ?? "",
      additional_info: additionalInfo,
    },
  };
}
