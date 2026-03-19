# GitHub Copilot Instructions for scrobbledb

> Custom instructions for GitHub Copilot when working on the scrobbledb project.

## ⚠️ Critical: This is a Bun.js Web App — Not Python, Not Node.js

scrobbledb is a **TypeScript web application that runs exclusively on [Bun](https://bun.sh)**.
There is no Python, no CLI, no npm/Node.js. Bun is the only runtime.

### Quick Reference

```bash
# Install dependencies (just TypeScript types)
bun install

# Start the web server (hot-reload)
bun dev                              # http://localhost:3000

# Start in production
bun start

# Custom port / database
bun start --port 8080
PORT=8080 SCROBBLEDB_PATH=/data/scrobbledb.db bun start

# Type-check (no build step needed — Bun runs TypeScript directly)
bun run typecheck
```

### Rules

- ✅ **DO** use `Bun.file()` / `Bun.write()` for file I/O
- ✅ **DO** use `Bun.CryptoHasher` for hashing (MD5 etc.)
- ✅ **DO** use `Bun.serve({ fetch })` for the HTTP server
- ✅ **DO** use `Bun.sleep(ms)` for async delays
- ✅ **DO** use `Bun.spawnSync()` / `Bun.spawn()` for subprocesses
- ✅ **DO** use `import { Database } from "bun:sqlite"` for SQLite
- ✅ **DO** use the global `fetch()` (Bun built-in) for HTTP requests
- ❌ **DON'T** import from `"fs"`, `"crypto"`, `"http"`, `"readline"`, `"os"`, `"path"` without the explicit `node:` prefix
- ❌ **DON'T** install express, fastify, better-sqlite3, axios, lodash, or any library that Bun provides natively
- ❌ **DON'T** write a CLI — this is a **web app only**
- ❌ **DON'T** use Python, pip, uv, poe, pytest, ruff, or any Python tooling

### Node → Bun API Substitution Table

| ❌ Node.js pattern | ✅ Bun-native substitute |
|---|---|
| `import { readFileSync } from "fs"` | `await Bun.file(path).text()` |
| `import { writeFileSync } from "fs"` | `await Bun.write(path, content)` |
| `import { existsSync } from "fs"` | `await Bun.file(path).exists()` |
| `import { mkdirSync } from "fs"` | `Bun.spawnSync(["mkdir", "-p", dir])` |
| `import { createHash } from "crypto"` | `new Bun.CryptoHasher("md5").update(s).digest("hex")` |
| `import { createServer } from "http"` | `Bun.serve({ fetch })` |
| `await new Promise(r => setTimeout(r, ms))` | `await Bun.sleep(ms)` |
| `new Database()` from `better-sqlite3` | `import { Database } from "bun:sqlite"` |
| `import readline from "readline"` | HTML form in the web UI |

---

## Project Overview

**scrobbledb** is a Bun.js web application that saves listening history from
[Last.fm](https://www.last.fm/) or [Libre.fm](https://libre.fm/) to a local SQLite
database and provides a browser-based UI for exploring it.

It is a port of the original Python CLI tool
[lastfm-to-sqlite](https://github.com/jacobian/lastfm-to-sqlite) by
[Jacob Kaplan-Moss](https://github.com/jacobian), later extended as a Python CLI by
[Brian M. Dennis](https://github.com/crossjam)
([crossjam/scrobbledb](https://github.com/crossjam/scrobbledb)).
This version is a full rewrite as a Bun.js web app.

### Technology Stack

| Concern | Tool |
|---|---|
| Runtime | [Bun](https://bun.sh) ≥ 1.0 |
| Language | TypeScript (strict mode) |
| Database | SQLite via `bun:sqlite` (built-in) |
| HTTP server | `Bun.serve()` (built-in) |
| Hashing | `Bun.CryptoHasher` (built-in) |
| HTTP client | `fetch()` (built-in) |
| Templating | Server-rendered HTML strings — no framework |
| Styling | Inline CSS in `src/web/templates.ts` — no build step |
| Type checking | `tsc --noEmit` via `bun run typecheck` |
| Dependencies | Zero runtime dependencies |

---

## Repository Structure

```
scrobbledb/
├── src/
│   ├── index.ts            Entry point — Bun.serve() on configured port
│   ├── config.ts           Auth/config (XDG dirs, Bun.file/write, network URLs)
│   ├── db.ts               bun:sqlite schema, FTS5 triggers, upsert helpers
│   ├── lastfm.ts           Last.fm + Libre.fm API client (Bun.CryptoHasher + fetch)
│   ├── queries.ts          Parameterised DB query functions
│   └── web/
│       ├── routes.ts       HTTP route handlers (GET/POST) and JSON API (/api/*)
│       └── templates.ts    Server-rendered HTML pages + shared CSS
├── package.json            Bun project — scripts only (no runtime deps)
├── tsconfig.json           TypeScript strict / bundler mode
├── .gitignore
├── .github/
│   ├── copilot-instructions.md   ← you are here
│   ├── WORKFLOWS.md
│   └── workflows/
│       └── qa.yml          CI: type-check + smoke-test with Bun
├── AGENTS.md               AI agent guidelines (mirrors this file)
├── LICENSE
└── README.md
```

---

## Supported Networks

Both **Last.fm** and **Libre.fm** are fully supported and work identically.
The only difference is the base API URL:

| Network | API Base URL |
|---|---|
| Last.fm | `https://ws.audioscrobbler.com/2.0/` |
| Libre.fm | `https://libre.fm/2.0/` |

Authentication uses `auth.getMobileSession` with an MD5-signed request
(`Bun.CryptoHasher` in `src/lastfm.ts`).
Credentials are saved to `${XDG_DATA_HOME}/dev.pirateninja.scrobbledb/auth.json`
using `Bun.write()`.

---

## Web Interface

### Pages

| Route | Description |
|---|---|
| `GET /` | Dashboard — overview stats + top artists |
| `GET /plays` | Paginated chronological play history |
| `GET /artists` | Artists list with sort controls |
| `GET /artists/:id` | Artist detail — top tracks + albums |
| `GET /albums` | Albums list with sort controls |
| `GET /albums/:id` | Album detail — track list |
| `GET /tracks` | Tracks list with sort controls |
| `GET /tracks/:id` | Track detail — play history |
| `GET /stats` | Yearly and monthly rollup statistics |
| `GET /search?q=…` | FTS5 full-text search |
| `GET /settings` | Configure Last.fm / Libre.fm credentials |
| `POST /settings/auth` | Authenticate and save credentials |
| `GET /ingest` | Import scrobbles form |
| `POST /ingest` | Streaming ingest — live progress to browser |

### JSON API

| Route | Description |
|---|---|
| `GET /api/stats` | Overview statistics |
| `GET /api/artists?limit=50` | Artist list |
| `GET /api/albums?limit=50` | Album list |
| `GET /api/tracks?limit=50` | Track list |
| `GET /api/plays?limit=50` | Recent plays |
| `GET /api/search?q=…&limit=50` | FTS5 search results |

---

## Database Schema

```sql
artists  (id TEXT PK, name TEXT NOT NULL)
albums   (id TEXT PK, title TEXT NOT NULL, artist_id → artists)
tracks   (id TEXT PK, title TEXT NOT NULL, album_id  → albums)
plays    (timestamp TEXT, track_id → tracks, PK (timestamp, track_id))
tracks_fts   -- FTS5 virtual table, kept in sync by triggers
```

Indexes: `plays(timestamp)`, `plays(track_id)`, `albums(artist_id)`, `tracks(album_id)`.

---

## Coding Conventions

### Style
- TypeScript **strict mode** — all code must pass `bun run typecheck` with zero errors
- No `any` unless unavoidable; prefer `unknown` + type guard
- `camelCase` for variables/functions, `PascalCase` for interfaces/types
- `UPPER_SNAKE_CASE` for module-level constants

### Imports
- Project files: relative paths (`"./db"`, `"../config"`)
- Bun built-ins: `"bun:sqlite"`, `Bun.*` globals — no import needed
- No third-party packages at runtime
- If a Node compat shim is truly necessary, use the explicit `"node:"` prefix

### Adding a New Page
1. Add `renderMyPage(...)` in `src/web/templates.ts` — use `escHtml()` for all user data
2. Register `get(/^\/mypage$/, handler)` in `src/web/routes.ts`
3. Add the nav link in `navHtml()` in `templates.ts`
4. Run `bun run typecheck` — must pass with zero errors

### Adding a New API Endpoint
1. Register `get(/^\/api\/myendpoint$/, handler)` in `src/web/routes.ts`
2. Return `json(data)` (helper at the top of `routes.ts`)

---

## Security Rules

- **SQL injection** — always use parameterised queries: `db.query(sql).all(...params)`
- **XSS** — always pass user-supplied strings through `escHtml()` before embedding in HTML
- **Credentials** — never log, echo, or expose auth secrets; `Bun.write()` to disk only
- **Numeric LIMIT in SQL** — validate as a number before interpolating (no string input allowed)

---

## Common Task Commands

| Task | Command |
|---|---|
| Start dev server | `bun dev` |
| Start prod server | `bun start` |
| Type-check | `bun run typecheck` |
| Check for Node imports | `grep -r "from \"fs\"" src/` |

---

## Resources

- **Bun docs**: https://bun.sh/docs
- **bun:sqlite**: https://bun.sh/docs/api/sqlite
- **Bun.serve**: https://bun.sh/docs/api/http
- **Bun.CryptoHasher**: https://bun.sh/docs/api/hashing
- **Last.fm API**: https://www.last.fm/api
- **Libre.fm API**: https://libre.fm/api

---

*These instructions help GitHub Copilot understand the scrobbledb Bun.js project
structure, conventions, and the exclusive use of Bun-native APIs.*
