/**
 * ScrobbleVault — Bun.js web application entry point.
 *
 * Starts a Bun-native HTTP server (Bun.serve) on the configured port.
 * Uses bun:sqlite for the database and Bun's built-in fetch for the
 * Last.fm / Libre.fm API. No Node.js APIs.
 *
 * Usage:
 *   bun run src/index.ts [--port 3000] [--database /path/to/db]
 *   bun run src/index.ts --help
 */

import { openDb, initSchema, setupFts5 } from "./db";
import { routeRequest } from "./web/routes";

// ─── CLI args (no "process.argv" parser library needed) ───────────────────────

const args = Bun.argv.slice(2);

function flag(name: string, fallback: string): string {
  const i = args.findIndex((a) => a === `--${name}`);
  return i !== -1 && args[i + 1] ? (args[i + 1] ?? fallback) : fallback;
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
ScrobbleVault — Save your listening history from Last.fm or Libre.fm.

Usage:
  bun run src/index.ts [options]

Options:
  --port <n>        Port to listen on          (default: 3000, or PORT env var)
  --database <path> Path to SQLite database    (default: XDG data directory)
  --host <addr>     Host/interface to bind to  (default: localhost)
  --help            Show this message
`);
  process.exit(0);
}

const PORT     = parseInt(flag("port", Bun.env.PORT ?? "3000"), 10);
const HOST     = flag("host", Bun.env.HOST ?? "localhost");
const DB_PATH  = flag("database", Bun.env.SCROBBLEDB_PATH ?? "");

// ─── Database bootstrap ───────────────────────────────────────────────────────

const db = openDb(DB_PATH || undefined);
initSchema(db);
setupFts5(db);

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
  ╔══════════════════════════════════════════╗
  ║        ScrobbleVault  (Bun ${Bun.version})       ║
  ╠══════════════════════════════════════════╣
  ║  Web UI  →  http://${HOST}:${PORT}${" ".repeat(Math.max(0, 18 - HOST.length - String(PORT).length))}║
  ║  API     →  http://${HOST}:${PORT}/api${" ".repeat(Math.max(0, 14 - HOST.length - String(PORT).length))}    ║
  ╚══════════════════════════════════════════╝

  Open http://${HOST}:${PORT} in your browser to get started.
  Go to Settings to configure your Last.fm or Libre.fm credentials.
  Press Ctrl+C to stop.
`);
