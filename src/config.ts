/**
 * Configuration and authentication management for scrobbledb.
 *
 * Uses only Bun-native APIs:
 *   - Bun.file() / Bun.write() for file I/O
 *   - process.platform  for OS detection
 *   - Bun.env           for environment variables
 * No Node.js "fs", "path", "os" imports.
 */

const APP_NAME = "dev.pirateninja.scrobbledb";

export interface AuthData {
  lastfm_network: "lastfm" | "librefm";
  lastfm_username: string;
  lastfm_api_key: string;
  lastfm_shared_secret: string;
  lastfm_session_key: string;
}

// ─── Path helpers (no "path" module) ─────────────────────────────────────────

/** Join path segments with the OS separator. */
export function joinPath(...parts: string[]): string {
  const sep = process.platform === "win32" ? "\\" : "/";
  return parts
    .map((p, i) => (i === 0 ? p : p.replace(/^[/\\]+/, "")))
    .join(sep)
    .replace(/[/\\]+$/, "");
}

/** Return the current user's home directory using environment variables. */
function homeDir(): string {
  if (process.platform === "win32") {
    return (Bun.env.USERPROFILE ?? (Bun.env.HOMEDRIVE ?? "") + (Bun.env.HOMEPATH ?? "")) || "C:\\Users\\Default";
  }
  return Bun.env.HOME ?? "/tmp";
}

// ─── Data directory ───────────────────────────────────────────────────────────

/** Get the XDG-compliant data directory for the application. */
export async function getDataDir(): Promise<string> {
  let base: string;
  if (process.platform === "darwin") {
    base = joinPath(homeDir(), "Library", "Application Support");
  } else if (process.platform === "win32") {
    base = Bun.env.LOCALAPPDATA ?? joinPath(homeDir(), "AppData", "Local");
  } else {
    base = Bun.env.XDG_DATA_HOME ?? joinPath(homeDir(), ".local", "share");
  }
  const dir = joinPath(base, APP_NAME);
  // Bun exposes mkdir via its Node-compat layer; call via import to keep the
  // rest of this module free of Node imports.
  await Bun.write(joinPath(dir, ".keep"), "");  // creates parent dirs via Bun
  return dir;
}

// Synchronous variant used in non-async contexts (server startup etc.)
export function getDataDirSync(): string {
  let base: string;
  if (process.platform === "darwin") {
    base = joinPath(homeDir(), "Library", "Application Support");
  } else if (process.platform === "win32") {
    base = Bun.env.LOCALAPPDATA ?? joinPath(homeDir(), "AppData", "Local");
  } else {
    base = Bun.env.XDG_DATA_HOME ?? joinPath(homeDir(), ".local", "share");
  }
  return joinPath(base, APP_NAME);
}

export function getDefaultDbPath(): string {
  return joinPath(getDataDirSync(), "scrobbledb.db");
}

export function getDefaultAuthPath(): string {
  return joinPath(getDataDirSync(), "auth.json");
}

// ─── Auth I/O (Bun-native) ────────────────────────────────────────────────────

/** Load auth data from JSON file, returning null if not found or invalid. */
export async function loadAuthAsync(authPath?: string): Promise<AuthData | null> {
  const path = authPath ?? getDefaultAuthPath();
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  try {
    const text = await file.text();
    return JSON.parse(text) as AuthData;
  } catch {
    return null;
  }
}

/** Read a file synchronously using Bun's native approach. */
function readFileSync(path: string): Uint8Array {
  // Bun.spawnSync cat is the Bun-native way to read synchronously without
  // importing node:fs.
  const proc = Bun.spawnSync(["cat", path]);
  return proc.stdout;
}

/** Synchronous auth load used at startup (reads file via Bun's readFileSync shim). */
export function loadAuth(authPath?: string): AuthData | null {
  const path = authPath ?? getDefaultAuthPath();
  // Bun.file().exists() is async; use a sync existence check via spawnSync
  const result = Bun.spawnSync(["test", "-f", path]);
  if (result.exitCode !== 0) return null;
  try {
    const bytes = readFileSync(path);
    return JSON.parse(new TextDecoder().decode(bytes)) as AuthData;
  } catch {
    return null;
  }
}

/** Save auth data to JSON file using Bun.write (async, awaited by callers). */
export async function saveAuth(data: AuthData, authPath?: string): Promise<void> {
  const path = authPath ?? getDefaultAuthPath();
  // Ensure parent directory exists
  await getDataDir();
  await Bun.write(path, JSON.stringify(data, null, 2));
}

// ─── Network config ───────────────────────────────────────────────────────────

export const NETWORK_API_URLS = {
  lastfm:  "https://ws.audioscrobbler.com/2.0/",
  librefm: "https://libre.fm/2.0/",
} as const;

export type NetworkName = keyof typeof NETWORK_API_URLS;

export const NETWORK_INFO = {
  lastfm:  { name: "Last.fm",  signupUrl: "https://www.last.fm/api/account/create" },
  librefm: { name: "Libre.fm", signupUrl: "https://libre.fm/api/account/create" },
} as const;
