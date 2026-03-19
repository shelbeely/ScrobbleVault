import type { Database } from "bun:sqlite";

import { md5 } from "./lastfm";

const DEFAULT_USERNAME = Bun.env.SCROBBLEVAULT_DEFAULT_USERNAME?.trim() || "admin";
const DEFAULT_PASSWORD = Bun.env.SCROBBLEVAULT_DEFAULT_PASSWORD || "changeme";
const SESSION_HOURS = Math.max(1, parseInt(Bun.env.SCROBBLEVAULT_SESSION_TTL_HOURS ?? "720", 10) || 720);

export const SESSION_COOKIE_NAME = "scrobblevault_session";

interface StoredUser {
  id: number;
  username: string;
  password_hash: string;
  password_md5: string;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: number;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  token: string;
  expiresAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function sha256(input: string): string {
  return new Bun.CryptoHasher("sha256").update(input).digest("hex");
}

function randomToken(bytes = 32): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data, (value) => value.toString(16).padStart(2, "0")).join("");
}

function toAppUser(user: StoredUser): AppUser {
  return {
    id: user.id,
    username: user.username,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function sessionDurationMs(): number {
  return SESSION_HOURS * 60 * 60 * 1000;
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const eq = part.indexOf("=");
        return eq === -1 ? [part, ""] : [part.slice(0, eq), decodeURIComponent(part.slice(eq + 1))];
      }),
  );
}

export async function ensureDefaultUser(db: Database): Promise<{ username: string; password: string; created: boolean }> {
  const existing = db.query("SELECT username FROM app_users ORDER BY id LIMIT 1").get() as { username: string } | null;
  if (existing) {
    return { username: existing.username, password: DEFAULT_PASSWORD, created: false };
  }

  const createdAt = nowIso();
  const passwordHash = await Bun.password.hash(DEFAULT_PASSWORD);
  db.prepare(
    `INSERT INTO app_users (username, password_hash, password_md5, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(DEFAULT_USERNAME, passwordHash, md5(DEFAULT_PASSWORD), createdAt, createdAt);

  console.warn(
    `[ScrobbleVault] Seeded default local user \"${DEFAULT_USERNAME}\" with password \"${DEFAULT_PASSWORD}\". ` +
      "Set SCROBBLEVAULT_DEFAULT_PASSWORD before first start to override it.",
  );

  return { username: DEFAULT_USERNAME, password: DEFAULT_PASSWORD, created: true };
}

export async function verifyUserCredentials(
  db: Database,
  username: string,
  passwordOrMd5: string,
): Promise<AppUser | null> {
  const trimmed = username.trim();
  if (!trimmed || !passwordOrMd5) return null;

  const user = db.prepare(
    `SELECT id, username, password_hash, password_md5, created_at, updated_at
     FROM app_users WHERE username = ?`,
  ).get(trimmed) as StoredUser | null;

  if (!user) return null;

  if (/^[a-f0-9]{32}$/i.test(passwordOrMd5) && passwordOrMd5.toLowerCase() === user.password_md5.toLowerCase()) {
    return toAppUser(user);
  }

  if (await Bun.password.verify(passwordOrMd5, user.password_hash)) {
    return toAppUser(user);
  }

  return null;
}

export function getSessionTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token) return token;
  }
  if (authHeader?.startsWith("Token ")) {
    const token = authHeader.slice("Token ".length).trim();
    if (token) return token;
  }

  const cookies = parseCookies(req.headers.get("cookie"));
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

export function getUserFromSessionToken(db: Database, token: string): AppUser | null {
  if (!token) return null;

  const row = db.prepare(
    `SELECT u.id, u.username, u.created_at, u.updated_at, s.expires_at
     FROM app_sessions s
     JOIN app_users u ON u.id = s.user_id
     WHERE s.token_hash = ?`,
  ).get(sha256(token)) as (AppUser & { expires_at: string }) | null;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare("DELETE FROM app_sessions WHERE token_hash = ?").run(sha256(token));
    return null;
  }

  db.prepare("UPDATE app_sessions SET last_used_at = ? WHERE token_hash = ?").run(nowIso(), sha256(token));
  return {
    id: row.id,
    username: row.username,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getAuthenticatedUser(req: Request, db: Database): AppUser | null {
  const token = getSessionTokenFromRequest(req);
  return token ? getUserFromSessionToken(db, token) : null;
}

export function createSession(db: Database, userId: number): SessionRecord {
  const token = randomToken();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + sessionDurationMs()).toISOString();

  db.prepare(
    `INSERT INTO app_sessions (id, user_id, token_hash, created_at, expires_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(crypto.randomUUID(), userId, sha256(token), createdAt, expiresAt, createdAt);

  return { token, expiresAt };
}

export function destroySession(db: Database, token: string): void {
  if (!token) return;
  db.prepare("DELETE FROM app_sessions WHERE token_hash = ?").run(sha256(token));
}

export function buildSessionCookie(token: string, expiresAt: string): string {
  const secure = Bun.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}${secure}`;
}

export function buildLogoutCookie(): string {
  const secure = Bun.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
}
