# ScrobbleVault

**Save your Last.fm or Libre.fm listening history to a local SQLite database
— explore it through a clean browser UI.**

ScrobbleVault is a **Bun.js web application** that fetches your scrobble history
from [Last.fm](https://www.last.fm/) or [Libre.fm](https://libre.fm/) and
stores it locally in a SQLite database.  Browse and analyse your music data
through an in-browser UI with no external dependencies.

## Origin & Credits

ScrobbleVault started as a port of
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
git clone https://github.com/shelbeely/ScrobbleVault.git
cd ScrobbleVault
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

## CLI

ScrobbleVault also ships an interactive TUI CLI built with [ink](https://github.com/vadimdemedes/ink) (React for CLIs).

```bash
bun run cli <command> [flags]
```

### Commands

| Command | Description |
|---|---|
| `stats` | Overview statistics with yearly progress bars |
| `artists` | Top artists with inline play-count bars |
| `albums` | Top albums with inline play-count bars |
| `tracks` | Top tracks with inline play-count bars |
| `plays` | Recent play history |
| `search <query>` | FTS5 full-text search across artists, albums, and tracks |
| `export` | Export data to CSV or JSON |
| `help` | Show usage |

### Examples

```bash
# Overview stats with top-years progress bars
bun run cli stats

# Top 10 artists sorted by play count (default), with inline bars
bun run cli artists --limit 10

# Albums sorted by most recently played
bun run cli albums --sort recent

# Plays from the last 7 days
bun run cli plays --since "7 days ago" --limit 50

# Full-text search
bun run cli search "radiohead"

# Export all plays as CSV
bun run cli export --format csv --type plays --output plays.csv

# Export top 100 artists as JSON to stdout
bun run cli export --format json --type artists --limit 100
```

### Options

| Flag | Description |
|---|---|
| `--database <path>` | SQLite database path (default: XDG data dir) |
| `--limit <N>` | Max rows (default: 20) |
| `--sort plays\|name\|title\|recent` | Sort field |
| `--order asc\|desc` | Sort direction (default: desc) |
| `--since <date>` | ISO date or `"N days ago"` — plays only |
| `--until <date>` | ISO date or `"N days ago"` — plays only |
| `--format csv\|json` | Export format |
| `--type artists\|albums\|tracks\|plays` | What to export |
| `--output <file>` | Write export to file instead of stdout |

---

## Getting Started

### 1. Configure credentials

Go to **Settings** (⚙️ in the nav bar) and enter your API credentials.

**Last.fm**: create an API account at
https://www.last.fm/api/account/create  
**Libre.fm**: no registration needed — you may use any 32-character string as
your API key and shared secret. See the
[Libre.fm developer docs](https://github.com/libre-fm/developer/wiki/Libre.fm-fundamentals)
for details.

Select your network, enter your username, API key, shared secret, and
password, then click **Save & Authenticate**.  
Both Last.fm and Libre.fm use the same authentication flow.

### 2. Import your history

Click **⬇ Import New Scrobbles** on the dashboard (or navigate to `/ingest`).
Optionally set a date range or limit, then start the import.  Progress streams
live to the browser.

On subsequent imports ScrobbleVault automatically picks up from where it left off.

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

ScrobbleVault follows the XDG Base Directory specification.  All data is stored in:

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

## Full Disclosure

Full disclosure, this project is primarily "auditionware". The main goal is to
provide something for potential external collaborators or employers to view and
review. Yup, it's a bit about me showing off. If you have strong opinions feel
free to fork this sucker and take it where your heart desires.

---

## Contributing

As mentioned above, this project is primarily "auditionware".

However, pull requests and issues are welcome, at least as criticism, feedback,
and inspiration! There might be a lag on responding or acceptance though.
You're likely best off assuming that a PR will take forever to be accepted if
at all. Similarly for addressing issues. For major changes, please open an
issue first to discuss what you would like to change.

---

## Agentic Coding Disclosure

Significant portions of this project were implemented through the use of
agentic coding tools such as Claude Code, GitHub Copilot Agent, OpenAI Codex,
and Gemini CLI. This was a specific goal intended to explore and increase my
proficiency with AI accelerated coding practices.

See [AGENTS.md](AGENTS.md) for detailed development guidelines.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).

Original **lastfm-to-sqlite** by Jacob Kaplan-Moss, originally under the
[WTFPL](https://www.wtfpl.net).
