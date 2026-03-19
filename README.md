# ScrobbleVault

**A Bun-native listening archive and self-hosted scrobbling backend for Last.fm, Libre.fm, ListenBrainz, and Panoscrobbler-style clients.**

ScrobbleVault stores your listening history in local SQLite, serves a browser UI, exposes a clean JSON API, and now includes a **Last.fm-compatible compatibility endpoint** so you can scrobble directly into it from apps like **Panoscrobbler** using its **“Last.fm-like instance”** connection type.

---

## Protocol model

ScrobbleVault now presents a cleaner mental model for protocol support in the self-hosted backend:

- **Libre.fm** → retro compatibility layer
- **Last.fm** → dominant but closed ecosystem
- **ListenBrainz** → future-proof open system

In practical terms, the backend exposes:

- **`/2.0/`** for the Last.fm / Libre.fm compatibility family
- **`/1/`** for ListenBrainz-style token-authenticated submission and history APIs

---

## Features

- Bun-native server with `Bun.serve()`
- SQLite storage with `bun:sqlite`
- Browser UI for dashboard, plays, artists, albums, tracks, wrapped, taste drift, universe map, timeline, and now-playing cache
- Local username/password auth with seeded default user on first run
- JSON API for login, recent listens, stats, scrobbling, and now-playing updates
- **Last.fm-compatible `/2.0/` endpoint** for:
  - `auth.getMobileSession`
  - `track.updateNowPlaying`
  - `track.scrobble`
  - `user.getRecentTracks`
  - `user.getInfo`
- **ListenBrainz-compatible `/1/` endpoint** for:
  - `GET /1/validate-token`
  - `POST /1/submit-listens`
  - `GET /1/user/:username/listens`
  - `GET /1/user/:username/listen-count`
  - `GET /1/user/:username/playing-now`
- Import from **Last.fm**, **Libre.fm**, or another **ScrobbleVault** instance as a third network option
- Duplicate-scrobble protection with a configurable time window
- Now-playing state cache for the self-hosted backend
- Ink-based CLI for exploring the local archive

---

## Architecture summary

ScrobbleVault remains a Bun-native app with two user-facing entry points:

- **Web app**: `src/index.ts`
- **CLI**: `src/cli/index.tsx`

Core modules:

- `src/db.ts` — schema, SQLite connection, metadata tables, auth/session tables
- `src/auth.ts` — local auth, session creation, cookie/token helpers
- `src/scrobble.ts` — normalization, dedupe, insertion, now-playing updates
- `src/lastfm.ts` — Last.fm / Libre.fm / ScrobbleVault compatibility client
- `src/queries.ts` — stats, lists, search, wrapped, heatmap, graph queries
- `src/web/routes.ts` — HTML routes, JSON API routes, and `/2.0/` compatibility layer
- `src/web/templates.ts` — server-rendered HTML pages

SQLite stores the canonical library tables (`artists`, `albums`, `tracks`, `plays`) plus:

- `play_metadata`
- `app_users`
- `app_sessions`
- `now_playing`

---

## Requirements

- [Bun](https://bun.sh) ≥ 1.0

Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Setup

```bash
git clone https://github.com/shelbeely/ScrobbleVault.git
cd ScrobbleVault
bun install
bun run migrate
bun run seed
```

On first startup, ScrobbleVault seeds a local user automatically if none exists.

Default first-run credentials:

- username: `admin`
- password: `changeme`

You should override that before first boot in real deployments:

```bash
export SCROBBLEVAULT_DEFAULT_USERNAME=me
export SCROBBLEVAULT_DEFAULT_PASSWORD='use-a-real-password'
```

---

## Running locally

```bash
# Start the web app + JSON API + compatibility backend
bun start

# Development mode
bun dev

# Explicit schema init
bun run migrate

# Explicit seed
bun run seed

# Typecheck
bun run typecheck

# CLI help
bun run cli help
```

By default the server listens on:

- `HOST=0.0.0.0`
- `PORT=3000` (or the platform-provided `PORT`)

Useful environment variables:

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port |
| `HOST` | Bind address, defaults to `0.0.0.0` |
| `SCROBBLEDB_PATH` | SQLite database path |
| `SCROBBLEVAULT_DEFAULT_USERNAME` | Seed username |
| `SCROBBLEVAULT_DEFAULT_PASSWORD` | Seed password |
| `SCROBBLEVAULT_DUPLICATE_WINDOW_SECONDS` | Duplicate-detection window (default `180`) |
| `SCROBBLEVAULT_SESSION_TTL_HOURS` | Session/token TTL (default `720`) |

---

## Deploying to Render.com

ScrobbleVault can deploy to Render, but **SQLite must live on a persistent disk**.

### Recommended setup

1. Create a **Web Service** using Bun.
2. Attach a **persistent disk** mounted at `/var/data`.
3. Set these environment variables:

```bash
HOST=0.0.0.0
SCROBBLEDB_PATH=/var/data/scrobbledb.db
SCROBBLEVAULT_DEFAULT_USERNAME=admin
SCROBBLEVAULT_DEFAULT_PASSWORD=<your password>
```

4. Use these commands:

- **Build command:** `bun install`
- **Start command:** `bun run start`

A sample `render.yaml` is included in the repo.

---

## Panoscrobbler / Pano Scrobbler compatibility

ScrobbleVault exposes a Last.fm-like compatibility endpoint at:

```text
https://your-app.onrender.com/2.0/
```

In Panoscrobbler’s **Last.fm-like instance** screen:

- **API URL** → `https://your-app.onrender.com/2.0/`
- **Username** → your ScrobbleVault local username
- **Password** → your ScrobbleVault local password

That flow is intended to work with:

- verification/login via `auth.getMobileSession`
- now-playing submission via `track.updateNowPlaying`
- scrobbling via `track.scrobble`

The same compatibility endpoint can also be used inside ScrobbleVault’s **Settings** page as a third network option alongside **Last.fm** and **Libre.fm**.

---

## Web UI

The browser UI includes:

- `/` — dashboard
- `/plays` — recent scrobbles
- `/artists` — artist browser
- `/albums` — album browser
- `/tracks` — track browser
- `/stats` — high-level stats
- `/search` — FTS search
- `/wrapped` — yearly summary
- `/universe` — artist graph view
- `/timeline` — listening heatmap
- `/taste` — taste-drift summary
- `/now-playing` — cached now-playing state
- `/settings` — external network / compatibility source settings
- `/login` — local session login page

---

## JSON API

### Auth

#### `POST /api/auth/login`

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"changeme"}'
```

Returns a JSON session token and also sets an HTTP-only cookie.

#### `POST /api/auth/logout`

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H 'Authorization: Bearer <session-token>'
```

#### `GET /api/me`

```bash
curl http://localhost:3000/api/me \
  -H 'Authorization: Bearer <session-token>'
```

---

### Ingestion endpoints

#### `POST /api/scrobble`

```bash
curl -X POST http://localhost:3000/api/scrobble \
  -H 'Authorization: Bearer <session-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "artist": "Boards of Canada",
    "track": "Dayvan Cowboy",
    "album": "The Campfire Headphase",
    "listenedAt": "2026-03-19T20:00:00.000Z"
  }'
```

#### `POST /api/now-playing`

```bash
curl -X POST http://localhost:3000/api/now-playing \
  -H 'Authorization: Bearer <session-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "artist": "Boards of Canada",
    "track": "Roygbiv",
    "album": "Music Has the Right to Children"
  }'
```

#### `GET /api/now-playing`

```bash
curl http://localhost:3000/api/now-playing
```

---

### Library and stats endpoints

#### `GET /health`

```bash
curl http://localhost:3000/health
```

#### `GET /api/recent`

```bash
curl 'http://localhost:3000/api/recent?limit=25&page=1'
```

#### `GET /api/stats/overview`

```bash
curl 'http://localhost:3000/api/stats/overview?since=30%20days%20ago'
```

#### `GET /api/stats/top-artists`

```bash
curl 'http://localhost:3000/api/stats/top-artists?limit=10'
```

#### `GET /api/stats/top-albums`

```bash
curl 'http://localhost:3000/api/stats/top-albums?limit=10'
```

#### `GET /api/stats/top-tracks`

```bash
curl 'http://localhost:3000/api/stats/top-tracks?limit=10'
```

#### Detail endpoints

```bash
curl http://localhost:3000/api/artists/<artist-id>
curl http://localhost:3000/api/albums/<album-id>
curl http://localhost:3000/api/tracks/<track-id>
```

Legacy analytics endpoints remain available too:

- `GET /api/stats`
- `GET /api/artists`
- `GET /api/albums`
- `GET /api/tracks`
- `GET /api/plays`
- `GET /api/search?q=...`

---

## ListenBrainz-compatible API examples

Use the token returned by `POST /api/auth/login` as your ListenBrainz-style auth token via `Authorization: Token <token>`.

### Validate token

```bash
curl http://localhost:3000/1/validate-token \
  -H 'Authorization: Token <session-token>'
```

### Submit playing now

```bash
curl -X POST http://localhost:3000/1/submit-listens \
  -H 'Authorization: Token <session-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "listen_type": "playing_now",
    "payload": [{
      "track_metadata": {
        "artist_name": "Boards of Canada",
        "track_name": "Roygbiv",
        "release_name": "Music Has the Right to Children",
        "additional_info": {"submission_client": "ScrobbleVault curl demo"}
      }
    }]
  }'
```

### Submit a completed listen

```bash
curl -X POST http://localhost:3000/1/submit-listens \
  -H 'Authorization: Token <session-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "listen_type": "single",
    "payload": [{
      "listened_at": 1710888000,
      "track_metadata": {
        "artist_name": "Boards of Canada",
        "track_name": "Roygbiv",
        "release_name": "Music Has the Right to Children"
      }
    }]
  }'
```

### Fetch listens

```bash
curl 'http://localhost:3000/1/user/admin/listens?count=5'
curl 'http://localhost:3000/1/user/admin/listen-count'
curl 'http://localhost:3000/1/user/admin/playing-now'
```

---

## Compatibility endpoint examples

### Login / verify

```bash
curl -X POST http://localhost:3000/2.0/ \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'method=auth.getMobileSession&username=admin&password=4cb9c8a8048fd02294477fcb1a41191a&api_key=x&api_sig=y&format=json'
```

> The `password` field above is the MD5 hash of `changeme`, matching the Last.fm mobile-session convention.

### Update now playing

```bash
curl -X POST http://localhost:3000/2.0/ \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'method=track.updateNowPlaying&sk=<session-key>&artist=Boards%20of%20Canada&track=Roygbiv&album=Music%20Has%20the%20Right%20to%20Children'
```

### Scrobble a track

```bash
curl -X POST http://localhost:3000/2.0/ \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'method=track.scrobble&sk=<session-key>&artist=Boards%20of%20Canada&track=Roygbiv&album=Music%20Has%20the%20Right%20to%20Children&timestamp=1710888000'
```

### Fetch recent tracks

```bash
curl 'http://localhost:3000/2.0/?method=user.getRecentTracks&user=admin&limit=5'
```

---

## CLI

ScrobbleVault also includes an Ink-based CLI:

```bash
bun run cli help
```

Examples:

```bash
bun run cli stats
bun run cli artists --limit 10
bun run cli albums --sort recent
bun run cli plays --since "7 days ago" --limit 50
bun run cli search "radiohead"
bun run cli export --format csv --type plays --output plays.csv
```

---

## Data storage

Default data locations:

| Platform | Default location |
|---|---|
| Linux/Unix | `~/.local/share/dev.pirateninja.scrobbledb/` |
| macOS | `~/Library/Application Support/dev.pirateninja.scrobbledb/` |
| Windows | `%LOCALAPPDATA%\dev.pirateninja.scrobbledb\` |

On Render, you should override this with a disk-backed path such as `/var/data/scrobbledb.db`.

---

## Validation

Typical local validation:

```bash
bun run typecheck
bun run src/index.ts --help
bun run cli help
```

---

## Future improvement ideas

- JSON/CSV import endpoints and preview mode
- loved-track toggle and persistence
- search endpoints for artists and albums with richer filters
- better session management UI
- stronger now-playing freshness expiration rules
- optional import jobs table and progress history
- richer Last.fm-compat coverage for more third-party scrobblers
