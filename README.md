# scrobbledb

**Save your Last.fm or Libre.fm listening history to a local SQLite database
— explore it through a clean browser UI.**

scrobbledb is a **Bun.js web application** that fetches your scrobble history
from [Last.fm](https://www.last.fm/) or [Libre.fm](https://libre.fm/) and
stores it locally in a SQLite database.  Browse and analyse your music data
through an in-browser UI with no external dependencies.

## Origin & Credits

scrobbledb started as a port of
[**lastfm-to-sqlite**](https://github.com/jacobian/lastfm-to-sqlite)
by [Jacob Kaplan-Moss](https://github.com/jacobian) (originally released under
the [WTFPL](https://www.wtfpl.net)).

It was then significantly extended as a Python CLI tool by
[Brian M. Dennis](https://github.com/crossjam) (the
[crossjam/scrobbledb](https://github.com/crossjam/scrobbledb) repository),
adding domain-specific commands, FTS5 search, an interactive TUI, export
options, and rich terminal output.

This version is a **full port to Bun.js** — rewritten as a web application
using only Bun's native APIs (`bun:sqlite`, `Bun.serve`, `Bun.CryptoHasher`,
`fetch`).  All credit for the original concept and data model goes to Jacob
Kaplan-Moss and Brian M. Dennis.

---

## Why Bun?

- **Single binary runtime** — no Python virtualenv, no npm install of 500 packages
- **Native SQLite** — `bun:sqlite` is built in, zero-dependency
- **Native HTTP server** — `Bun.serve()` is built in, no express/fastify
- **Native crypto** — `Bun.CryptoHasher` for MD5 signing
- **Fast** — Bun starts and runs significantly faster than Node.js or Python

---

## Requirements

- [Bun](https://bun.sh) ≥ 1.0

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Installation

```bash
git clone https://github.com/shelbeely/scrobbledb.git
cd scrobbledb
bun install
```

---

## Usage

```bash
# Start the web server (default: http://localhost:3000)
bun start

# Custom port
bun start --port 8080

# Custom database path
bun start --database /path/to/scrobbledb.db

# Development mode (hot-reload)
bun dev
```

Open **http://localhost:3000** in your browser.

---

## Getting Started

### 1. Configure credentials

Go to **Settings** (⚙️ in the nav bar) and enter your API credentials.

**Last.fm**: create an API account at
https://www.last.fm/api/account/create  
**Libre.fm**: create an API account at
https://libre.fm/api/account/create

Select your network, enter your username, API key, shared secret, and
password, then click **Save & Authenticate**.  
Both Last.fm and Libre.fm use the same authentication flow.

### 2. Import your history

Click **⬇ Import New Scrobbles** on the dashboard (or navigate to `/ingest`).
Optionally set a date range or limit, then start the import.  Progress streams
live to the browser.

On subsequent imports scrobbledb automatically picks up from where it left off.

### 3. Explore

| Page | What it shows |
|---|---|
| **Dashboard** | Overview stats + top artists |
| **Plays** | Full chronological play history |
| **Artists** | All artists, sortable by plays / name / recent |
| **Albums** | All albums, sortable by plays / title / recent |
| **Tracks** | All tracks, sortable by plays / title / recent |
| **Stats** | Yearly and monthly breakdown |
| **Search** | Full-text search across artists, albums, and tracks |

---

## JSON API

Every page has a matching JSON endpoint:

| Endpoint | Description |
|---|---|
| `GET /api/stats` | Overview statistics |
| `GET /api/artists?limit=50` | Artist list |
| `GET /api/albums?limit=50` | Album list |
| `GET /api/tracks?limit=50` | Track list |
| `GET /api/plays?limit=50` | Recent plays |
| `GET /api/search?q=radiohead&limit=20` | FTS5 search |

---

## Data Storage

scrobbledb follows the XDG Base Directory specification.  All data is stored in:

| Platform | Default location |
|---|---|
| Linux/Unix | `~/.local/share/dev.pirateninja.scrobbledb/` |
| macOS | `~/Library/Application Support/dev.pirateninja.scrobbledb/` |
| Windows | `%LOCALAPPDATA%\dev.pirateninja.scrobbledb\` |

Override with `--database /custom/path.db` or `SCROBBLEDB_PATH=/custom/path.db`.

### Database schema

```sql
artists  (id, name)
albums   (id, title, artist_id)
tracks   (id, title, album_id)
plays    (timestamp, track_id)          -- primary key: (timestamp, track_id)
tracks_fts                              -- FTS5 virtual table for full-text search
```

---

## Development

```bash
bun dev               # hot-reload server
bun run typecheck     # TypeScript strict type-check (no emit)
```

See [AGENTS.md](AGENTS.md) for full developer and AI-agent guidelines,
including the complete list of Bun-native API substitutes for Node.js patterns.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).

Original **lastfm-to-sqlite** by Jacob Kaplan-Moss, originally under the
[WTFPL](https://www.wtfpl.net).
