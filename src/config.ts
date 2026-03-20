/**
 * Configuration and authentication management for ScrobbleVault.
 *
 * Uses only Bun-native APIs:
 *   - Bun.file() / Bun.write() for file I/O
 *   - process.platform  for OS detection
 *   - Bun.env           for environment variables
 * Uses an explicit node:fs import only for cross-platform sync existence checks.
 */

import { existsSync } from "node:fs";

const APP_NAME = "dev.scrobblevault.app";
const LEGACY_APP_NAMES = ["dev.pirateninja.scrobblevault", "dev.pirateninja.scrobbledb"] as const;
const DEFAULT_DB_FILE_NAME = "scrobblevault.db";
const LEGACY_DB_FILE_NAME = "scrobbledb.db";
export const SCROBBLEVAULT_COMPAT_PATH = "/2.0/";

export interface AuthData {
  lastfm_network: "lastfm" | "librefm" | "scrobblevault";
  lastfm_username: string;
  lastfm_api_key: string;
  lastfm_shared_secret: string;
  lastfm_session_key: string;
  lastfm_custom_api_url?: string;
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

function preferPrimaryPath(primaryPath: string, legacyPath: string): string {
  if (existsSync(primaryPath) || !existsSync(legacyPath)) {
    return primaryPath;
  }
  return legacyPath;
}

function resolveLegacyPath(primaryPath: string, legacyPaths: readonly string[]): string {
  let resolved = primaryPath;
  for (const legacyPath of legacyPaths) {
    resolved = preferPrimaryPath(resolved, legacyPath);
  }
  return resolved;
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
  const appDir = joinPath(base, APP_NAME);
  const legacyDirs = LEGACY_APP_NAMES.map((name) => joinPath(base, name));
  const dir = resolveLegacyPath(appDir, legacyDirs);
  await Bun.write(joinPath(dir, ".keep"), "");
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
  const appDir = joinPath(base, APP_NAME);
  const legacyDirs = LEGACY_APP_NAMES.map((name) => joinPath(base, name));
  return resolveLegacyPath(appDir, legacyDirs);
}

export function getDefaultDbPath(): string {
  const dataDir = getDataDirSync();
  const dbPath = joinPath(dataDir, DEFAULT_DB_FILE_NAME);
  const legacyDbPath = joinPath(dataDir, LEGACY_DB_FILE_NAME);
  return preferPrimaryPath(dbPath, legacyDbPath);
}

export function getDefaultAuthPath(): string {
  return joinPath(getDataDirSync(), "auth.json");
}

/** Return the configured database path, preferring the new env var and falling back to the legacy name. */
export function getConfiguredDbPath(): string | undefined {
  return Bun.env.SCROBBLEVAULT_DB_PATH ?? Bun.env.SCROBBLEDB_PATH;
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
  const proc = Bun.spawnSync(["cat", path]);
  return proc.stdout;
}

/** Synchronous auth load used at startup (reads file via Bun's readFileSync shim). */
export function loadAuth(authPath?: string): AuthData | null {
  const path = authPath ?? getDefaultAuthPath();
  if (!existsSync(path)) return null;
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
  await getDataDir();
  await Bun.write(path, JSON.stringify(data, null, 2));
}

// ─── Network config ───────────────────────────────────────────────────────────

export const NETWORK_API_URLS = {
  lastfm: "https://ws.audioscrobbler.com/2.0/",
  librefm: "https://libre.fm/2.0/",
  scrobblevault: `http://localhost:3000${SCROBBLEVAULT_COMPAT_PATH}`,
} as const;

export type NetworkName = keyof typeof NETWORK_API_URLS;

export const NETWORK_INFO = {
  lastfm: {
    name: "Last.fm",
    signupUrl: "https://www.last.fm/api/account/create",
    description: "Use your Last.fm API credentials and password.",
  },
  librefm: {
    name: "Libre.fm",
    signupUrl: "https://libre.fm/api/account/create",
    description: "Libre.fm accepts any 32-character API key and shared secret.",
  },
  scrobblevault: {
    name: "ScrobbleVault",
    signupUrl: "",
    description: "Use the compatibility endpoint from a self-hosted ScrobbleVault instance.",
  },
} as const;

export const SCROBBLEVAULT_COMPAT_APP_KEY = "ScrobbleVaultCompat";
export const SCROBBLEVAULT_COMPAT_SHARED_SECRET = "ScrobbleVaultCompatSecret";

export function normalizeCompatApiUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return NETWORK_API_URLS.scrobblevault;

  let urlText = raw;
  if (!/^https?:\/\//i.test(urlText)) urlText = `http://${urlText}`;
  urlText = urlText.replace(/\/+$/, "");

  if (!urlText.endsWith("/2.0")) {
    urlText += SCROBBLEVAULT_COMPAT_PATH.slice(0, -1);
  }

  return `${urlText}/`;
}

export function resolveNetworkApiUrl(network: NetworkName, customApiUrl?: string): string {
  if (network === "scrobblevault") {
    return normalizeCompatApiUrl(customApiUrl ?? NETWORK_API_URLS.scrobblevault);
  }
  return NETWORK_API_URLS[network];
}

export function getNetworkDisplayName(network: NetworkName): string {
  return NETWORK_INFO[network].name;
}
