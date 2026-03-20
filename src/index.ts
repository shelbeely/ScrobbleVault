/**
 * ScrobbleVault — Bun.js web application entry point.
 *
 * Starts a Bun-native HTTP server (Bun.serve) on the configured port.
 * Uses bun:sqlite for the database and Bun's built-in fetch for the
 * Last.fm / Libre.fm / ScrobbleVault compatibility APIs. No Node.js APIs.
 *
 * Usage:
 *   bun run src/index.ts [--port 3000] [--database /path/to/db]
 *   bun run src/index.ts --help
 */

import { ensureDefaultUser } from "./auth";
import { openDb, initSchema, setupFts5 } from "./db";
import { getConfiguredDbPath } from "./config";
import { routeRequest } from "./web/routes";

// ─── CLI args (no "process.argv" parser library needed) ───────────────────────

const args = Bun.argv.slice(2);

function flag(name: string, fallback: string): string {
  const index = args.findIndex((arg) => arg === `--${name}`);
  return index !== -1 && args[index + 1] ? (args[index + 1] ?? fallback) : fallback;
}

function failStartupValidation(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    failStartupValidation(`invalid port value "${value}". Expected an integer between 1 and 65535.`);
  }
  return port;
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
ScrobbleVault — Save your listening history with Last.fm, Libre.fm, ListenBrainz, or a self-hosted ScrobbleVault instance.

Usage:
  bun run src/index.ts [options]

Options:
  --port <n>        Port to listen on          (default: 3000, or PORT env var)
  --database <path> Path to SQLite database    (default: XDG data directory)
  --host <addr>     Host/interface to bind to  (default: 0.0.0.0)
  --help            Show this message
`);
  process.exit(0);
}

const PORT = parsePort(flag("port", Bun.env.PORT ?? "3000"));
const HOST = flag("host", Bun.env.HOST ?? "0.0.0.0");
const DB_PATH = flag("database", getConfiguredDbPath() ?? "");

// ─── Database bootstrap ───────────────────────────────────────────────────────

const db = openDb(DB_PATH || undefined);
initSchema(db);
setupFts5(db);
const seededUser = await ensureDefaultUser(db);

// ─── Server (Bun.serve — no http/express/fastify) ────────────────────────────

const server = Bun.serve({
  port: PORT,
  hostname: HOST,

  fetch(req) {
    return routeRequest(req, db);
  },

  error(err) {
    console.error("Server error:", err);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║                 ScrobbleVault (Bun ${Bun.version})                ║
  ╠════════════════════════════════════════════════════════════╣
  ║  Web UI       →  http://${HOST}:${PORT}${" ".repeat(Math.max(0, 28 - HOST.length - String(PORT).length))}║
  ║  JSON API     →  http://${HOST}:${PORT}/api${" ".repeat(Math.max(0, 24 - HOST.length - String(PORT).length))}║
  ║  LB API       →  http://${HOST}:${PORT}/1/${" ".repeat(Math.max(0, 25 - HOST.length - String(PORT).length))}║
  ║  Compat API   →  http://${HOST}:${PORT}/2.0/${" ".repeat(Math.max(0, 23 - HOST.length - String(PORT).length))}║
  ╚════════════════════════════════════════════════════════════╝

  Default local user: ${seededUser.username}
  Open http://${HOST}:${PORT} in your browser to get started.
  ListenBrainz-style API root: http://${HOST}:${PORT}/1/
  Point Panoscrobbler's “Last.fm-like instance” URL at http://${HOST}:${PORT}/2.0/
  Press Ctrl+C to stop.
`);

void server;
