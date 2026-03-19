# AGENTS.md — Copilot Instructions for scrobbledb

> Custom instructions for GitHub Copilot and AI coding agents working on the
> **scrobbledb** Bun.js web application.

---

## ⚠️ Runtime: Bun Only — No Node.js

This project runs **exclusively on [Bun](https://bun.sh)**.  
Do **not** use any Node.js-specific APIs. The table below lists the correct
Bun-native substitute for every common Node pattern:

| ❌ Node.js pattern | ✅ Bun-native substitute |
|---|---|
| `import { readFileSync } from "fs"` | `await Bun.file(path).text()` |
| `import { writeFileSync } from "fs"` | `await Bun.write(path, content)` |
| `import { existsSync } from "fs"` | `await Bun.file(path).exists()` |
| `import { mkdirSync } from "fs"` | `Bun.spawnSync(["mkdir", "-p", dir])` |
| `import { createHash } from "crypto"` | `new Bun.CryptoHasher("md5").update(s).digest("hex")` |
| `import { createServer } from "http"` | `Bun.serve({ fetch })` |
| `setTimeout / setInterval` | `setTimeout` (global, same API in Bun) |
| `await new Promise(r => setTimeout(r, ms))` | `await Bun.sleep(ms)` |
| `new Database()` from `better-sqlite3` | `import { Database } from "bun:sqlite"` |
| `import readline from "readline"` | Read stdin via `process.stdin` or a prompt form |

### Rules

- ✅ **DO** use `bun:sqlite` for all database access  
- ✅ **DO** use `Bun.serve()` for the HTTP server  
- ✅ **DO** use `Bun.CryptoHasher` for hashing  
- ✅ **DO** use `Bun.file()` / `Bun.write()` for file I/O  
- ✅ **DO** use `fetch()` (built-in) for HTTP requests  
- ✅ **DO** use `Bun.sleep()` for async delays  
- ✅ **DO** use `Bun.spawnSync()` / `Bun.spawn()` for subprocesses  
- ❌ **DON'T** import from `"fs"`, `"crypto"`, `"http"`, `"readline"`, `"os"`, `"path"` without the `node:` prefix (use Bun-native instead where one exists)  
- ❌ **DON'T** install `express`, `fastify`, `better-sqlite3`, or any HTTP/DB library — Bun provides these natively  
- ❌ **DON'T** add a CLI — this is a **web app only**

---

## Quick Start

```bash
# Install / sync dependencies (just TypeScript types)
bun install

# Start the development server with hot-reload
bun dev         # or: bun --hot run src/index.ts

# Start production server
bun start       # or: bun run src/index.ts

# Type-check without running
bun run typecheck

# Custom port / database path
bun start --port 8080 --database /path/to/scrobbledb.db
# or via env vars:
PORT=8080 SCROBBLEDB_PATH=/path/to/scrobbledb.db bun start
```

Open <http://localhost:3000> in your browser.

---

## Project Overview

**scrobbledb** is a Bun.js web application that saves listening history from
[Last.fm](https://www.last.fm/) or [Libre.fm](https://libre.fm/) to a local
SQLite database and provides a browser-based UI for exploring it.

It is a port of the original Python CLI tool
[lastfm-to-sqlite](https://github.com/jacobian/lastfm-to-sqlite) by
[Jacob Kaplan-Moss](https://github.com/jacobian), later extended by
[Brian M. Dennis](https://github.com/crossjam) as
[scrobbledb](https://github.com/crossjam/scrobbledb).

### Technology Stack

| Concern | Tool |
|---|---|
| Runtime | [Bun](https://bun.sh) ≥ 1.0 |
| Language | TypeScript (strict mode) |
| Database | SQLite via `bun:sqlite` |
| HTTP server | `Bun.serve()` |
| Hashing | `Bun.CryptoHasher` |
| External HTTP | `fetch()` (Bun built-in) |
| Templating | Server-rendered HTML strings (no framework) |
| Styling | Inline CSS in `src/web/templates.ts` |
| Type checking | `tsc --noEmit` via `bun run typecheck` |

---

## Repository Structure

```
scrobbledb/
├── src/
│   ├── index.ts            Main entry point — starts Bun.serve()
│   ├── config.ts           Auth/config management, XDG data dirs, network URLs
│   ├── db.ts               bun:sqlite schema, FTS5, upsert helpers
│   ├── lastfm.ts           Last.fm + Libre.fm API client (Bun.CryptoHasher + fetch)
│   ├── queries.ts          Database query functions (stats, artists, albums, tracks, plays)
│   └── web/
│       ├── routes.ts       HTTP route handlers (GET + POST) + JSON API
│       └── templates.ts    Server-rendered HTML page templates + shared CSS
├── package.json            Bun project config
├── tsconfig.json           TypeScript config (strict, bundler mode)
├── .gitignore
├── AGENTS.md               ← you are here
├── LICENSE
└── README.md
```

---

## Supported Networks

Both **Last.fm** and **Libre.fm** are fully supported.  
They share the same API shape; only the base URL differs:

| Network | API Base URL |
|---|---|
| Last.fm | `https://ws.audioscrobbler.com/2.0/` |
| Libre.fm | `https://libre.fm/2.0/` |

Authentication uses `auth.getMobileSession` with an MD5-signed request
(handled by `Bun.CryptoHasher` in `src/lastfm.ts`).  
Credentials are stored in `${XDG_DATA_HOME}/dev.pirateninja.scrobbledb/auth.json`.

---

## Web Interface — Pages & API

### Browser Pages

| Route | Description |
|---|---|
| `GET /` | Dashboard — overview stats + top artists |
| `GET /plays` | Paginated play history |
| `GET /artists` | Paginated artist list with sort controls |
| `GET /artists/:id` | Artist detail — top tracks + albums |
| `GET /albums` | Paginated album list with sort controls |
| `GET /albums/:id` | Album detail — track list |
| `GET /tracks` | Paginated track list with sort controls |
| `GET /tracks/:id` | Track detail — full play history |
| `GET /stats` | Yearly and monthly statistics |
| `GET /search?q=…` | FTS5 full-text search |
| `GET /settings` | Configure Last.fm / Libre.fm credentials |
| `POST /settings/auth` | Save and authenticate credentials |
| `GET /ingest` | Import scrobbles form |
| `POST /ingest` | Streaming ingest — progress sent as plain-text chunks |

### JSON API

| Route | Description |
|---|---|
| `GET /api/stats` | Overview stats object |
| `GET /api/artists?limit=50` | Artist list |
| `GET /api/albums?limit=50` | Album list |
| `GET /api/tracks?limit=50` | Track list |
| `GET /api/plays?limit=50` | Recent plays |
| `GET /api/search?q=…&limit=50` | FTS5 search results |

---

## Database Schema

```sql
artists  (id TEXT PK, name TEXT)
albums   (id TEXT PK, title TEXT, artist_id → artists)
tracks   (id TEXT PK, title TEXT, album_id  → albums)
plays    (timestamp TEXT, track_id → tracks, PK (timestamp, track_id))
tracks_fts   FTS5 virtual table (artist_name, album_title, track_title,
                                  artist_id, album_id, track_id UNINDEXED)
```

FTS5 triggers keep `tracks_fts` in sync automatically on INSERT/UPDATE/DELETE.

---

## Coding Conventions

### Style
- **TypeScript strict mode** — all code must pass `bun run typecheck`
- No `any` types unless absolutely unavoidable
- `camelCase` for variables/functions, `PascalCase` for types/interfaces
- `UPPER_SNAKE_CASE` for module-level constants

### Imports
- Use relative imports for project files (`"./db"`, `"../config"`)
- Bun built-ins: `"bun:sqlite"`, `Bun.*` globals
- No third-party packages (Bun's standard library covers all needs)
- If you must use a Node compat module, use the explicit `"node:"` prefix

### Adding a New Page
1. Add a `renderMyPage(...)` function in `src/web/templates.ts`
2. Register `get(/^\/mypage$/, handler)` in `src/web/routes.ts`
3. Add the nav link in the `navHtml()` function in `templates.ts`
4. Run `bun run typecheck` to confirm no type errors

### Adding a New API Endpoint
1. Register `get(/^\/api\/myendpoint$/, handler)` in `src/web/routes.ts`
2. Return `json(data)` (the helper at the top of `routes.ts`)

---

## Security Notes

- **SQL injection**: all queries use parameterised statements via `db.query().all(...params)`
- **XSS**: all user-supplied strings are passed through `escHtml()` in `templates.ts`
- **Auth credentials**: stored only in the local XDG data directory; never logged or echoed
- **API secrets**: never committed — users enter them via the Settings UI
