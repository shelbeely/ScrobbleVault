# scrobbledb

[![QA](https://github.com/crossjam/scrobbledb/actions/workflows/qa.yml/badge.svg)](https://github.com/crossjam/scrobbledb/actions/workflows/qa.yml)

**Save your listening history from Last.fm or Libre.fm to a local SQLite database.**

scrobbledb is available in **two flavours**:

- **Python CLI** — the original command-line tool with a rich terminal UI and interactive browser
- **Node.js CLI + Web interface** — a full port to Node.js that adds a web browser UI (`web/`)

Both implementations share the same SQLite database schema, so data ingested by one can be explored by the other.

**Full disclosure, this project is primarily "auditionware".** The
main goal is to provide something for potential external collaborators
or employers to view and review. Yup, it’s a bit about me showing
off. If you have strong opinions feel free to fork this sucker and
take it where your heart desires.

## About Last.fm and Scrobbling

[Last.fm](https://www.last.fm/) is a music discovery and tracking
service that records what you listen to across different platforms and
devices. This process of recording your listening history is called
"scrobbling." 

**Scrobbling** automatically logs each track you play—including the
artist, album, track name, and timestamp—creating a detailed history
of your music consumption over time. Last.fm aggregates this data to
generate statistics, recommendations, and insights about your
listening habits. 

The **Last.fm API** provides programmatic access to this scrobble
data, allowing applications like scrobbledb to retrieve and analyze
your complete listening history. [Libre.fm](https://libre.fm/) is an
open-source alternative that offers compatible scrobbling services. 

## Why scrobbledb?

- **Local backup**: Keep your listening history in a local database you control
- **Advanced queries**: Use SQL to analyze your music habits in ways the web interface doesn't support
- **Data portability**: Export your data in multiple formats (JSON, CSV, TSV)
- **Full-text search**: Find tracks, albums, and artists instantly with SQLite FTS5
- **Interactive browsing**: Explore your library with a terminal UI
- **Privacy**: Your data stays on your machine

## Origin

scrobbledb is a modernization of [Jacob
Kaplan-Moss's](https://github.com/jacobian/)
[lastfm-to-sqlite](https://github.com/jacobian/lastfm-to-sqlite)
project. The Python version has been significantly expanded with:

- Modern Python tooling (uv, ruff, type hints)
- Domain-specific commands for exploring artists, albums, tracks, and plays
- Interactive terminal UI for browsing
- Full-text search capabilities
- Comprehensive data export options
- Enhanced statistics and filtering
- Rich terminal output with tables and progress bars

The Node.js port adds a **web browser interface** while fully replicating the CLI feature set, using only Node.js built-in modules plus Express and better-sqlite3.

**Original concept and implementation by [Jacob Kaplan-Moss](https://github.com/jacobian/).
Python modernization and Node.js port by [Brian M. Dennis](https://github.com/crossjam).**

---

## Node.js CLI + Web Interface

> **Location:** `web/` directory — Node.js 18+ required

### Installation

```bash
cd web
npm install
```

### Quick Start (Node.js)

```bash
# 1. Save credentials
node bin/scrobbledb.js auth

# 2. Initialize the database
node bin/scrobbledb.js config init

# 3. Import your listening history
node bin/scrobbledb.js ingest

# 4. Explore from the terminal
node bin/scrobbledb.js stats overview
node bin/scrobbledb.js artists top
node bin/scrobbledb.js search "pink floyd"

# 5. Browse via web interface
node bin/scrobbledb.js web
# → open http://localhost:3000
```

Or start the web server directly:

```bash
SCROBBLEDB_PATH=/path/to/scrobbledb.db node web/server.js
# or
node web/server.js --db /path/to/scrobbledb.db --port 3000
```

### Node.js CLI Command Reference

All commands accept `-d / --database <path>` to point at a custom database.

#### Data management

| Command | Description |
|---------|-------------|
| `auth` | Save Last.fm/Libre.fm credentials interactively |
| `config init [--dry-run] [--no-index]` | Initialize database and FTS5 index |
| `config reset [--force]` | Delete and recreate the database |
| `config location` | Show XDG data/config directory paths |
| `ingest [--since] [--until] [--limit]` | Fetch listening history from Last.fm |
| `import <file> [--format auto\|jsonl\|csv\|tsv]` | Import scrobbles from a file or stdin |
| `index` | Build or rebuild the FTS5 full-text search index |
| `export [--preset plays\|tracks\|albums\|artists] [--format json\|jsonl\|csv\|tsv]` | Export data |

#### Data exploration

| Command | Description |
|---------|-------------|
| `search <query> [-l limit]` | Full-text search across tracks, artists, albums |
| `stats overview` | Total scrobbles, artists, albums, tracks, date range |
| `stats monthly [--limit n]` | Month-by-month scrobble counts |
| `stats yearly [--limit n]` | Year-by-year scrobble counts |
| `artists top [-l n]` | Top artists by play count |
| `albums top [-l n]` | Top albums by play count |
| `tracks top [-l n]` | Top tracks by play count |
| `plays recent [-l n]` | Most recent plays |

#### Advanced

| Command | Description |
|---------|-------------|
| `sql query "<SQL>"` | Execute a raw SQL query |
| `sql tables` | List all database tables |
| `sql schema [table]` | Show CREATE TABLE schema |
| `sql rows <table> [-l n]` | Show rows from a table |
| `web [--port n]` | Start the web interface |

### Web Interface Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with overview statistics |
| `/artists` | Top artists by play count (paginated) |
| `/albums` | Top albums by play count (paginated) |
| `/tracks` | Top tracks by play count (paginated) |
| `/search?q=<query>` | Full-text search |
| `/api/stats` | JSON: overview statistics |
| `/api/artists` | JSON: top artists |
| `/api/albums` | JSON: top albums |
| `/api/tracks` | JSON: top tracks |
| `/api/search?q=<query>` | JSON: search results |

---

## Python CLI

> **Requirements:** Python 3.11+, [uv](https://github.com/astral-sh/uv)

### Installation (Python)

```bash
# Clone the repository
git clone https://github.com/crossjam/scrobbledb.git
cd scrobbledb

# Install dependencies
uv sync

# Run scrobbledb
uv run scrobbledb --help
```

### Quick Start (Python)

```bash
# 1. Save your Last.fm credentials
uv run scrobbledb auth

# 2. Initialize the database
uv run scrobbledb config init

# 3. Import your listening history
uv run scrobbledb ingest

# 4. Explore your data
uv run scrobbledb search "pink floyd"
uv run scrobbledb plays list --limit 50
uv run scrobbledb browse          # interactive TUI
uv run scrobbledb artists top --limit 20
uv run scrobbledb stats overview
```

**Getting API credentials**: Visit [Last.fm
API](https://www.last.fm/api/account/create) to create an API account
and obtain your API key and shared secret.

### Python Command Overview

#### Data Management

- **`auth`** - Configure Last.fm/Libre.fm API credentials ([docs](docs/commands/auth.md))
- **`config`** - Initialize database, reset data, or show configuration paths ([docs](docs/commands/config.md))
- **`ingest`** - Fetch listening history from Last.fm/Libre.fm ([docs](docs/commands/ingest.md))
- **`import`** - Import scrobbles from JSONL, CSV, or TSV files ([docs](docs/commands/import.md))
- **`index`** - Create or rebuild the full-text search index ([docs](docs/commands/index.md))
- **`export`** - Export data in various formats with presets or custom SQL ([docs](docs/commands/export.md))

#### Data Exploration

- **`search`** - Full-text search across artists, albums, and tracks ([docs](docs/commands/search.md))
- **`browse`** - Interactive terminal UI for browsing tracks ([docs](docs/commands/browse.md))
- **`plays`** - View and filter listening history chronologically ([docs](docs/commands/plays.md))
- **`artists`** - Browse artists, view top artists, see detailed statistics ([docs](docs/commands/artists.md))
- **`albums`** - Search albums and view album details with tracks ([docs](docs/commands/albums.md))
- **`tracks`** - Search tracks, view top tracks, see play history ([docs](docs/commands/tracks.md))
- **`stats`** - Generate listening statistics (overview, monthly, yearly) ([docs](docs/commands/stats.md))

#### Advanced

- **`sql`** - Direct access to sqlite-utils commands for power users ([docs](docs/commands/sql.md))
- **`version`** - Display the installed version ([docs](docs/commands/version.md))

See the [CLI overview](docs/cli.md) for a complete command reference and detailed documentation for each command.

## Database Schema

scrobbledb stores your data in a normalized SQLite database:

- **`artists`** - Artist information (id, name)
- **`albums`** - Album information (id, title, artist_id)
- **`tracks`** - Track information (id, title, album_id)
- **`plays`** - Play events (track_id, timestamp)
- **`tracks_fts`** - FTS5 full-text search index

This schema enables efficient queries, comprehensive searches, and detailed analysis of your listening history.

## Example Workflows

### Backup your data weekly

```bash
# Update with new scrobbles
uv run scrobbledb ingest --since-date "7 days ago"

# Export to JSON backup
uv run scrobbledb export plays --format json --output backup-$(date +%Y%m%d).json
```

### Find your most-played tracks from a specific year

```bash
uv run scrobbledb tracks top --since 2023-01-01 --until 2023-12-31 --limit 50
```

### Analyze your listening patterns

```bash
# Monthly breakdown
uv run scrobbledb stats monthly --year 2024

# Top artists in the last 30 days
uv run scrobbledb artists top --since "30 days ago"

# All plays for a specific artist
uv run scrobbledb plays list --artist "Radiohead" --limit 1000
```

### Export data for external analysis

```bash
# Export to CSV for Excel/pandas
uv run scrobbledb export plays --format csv --output plays.csv

# Custom SQL query
uv run scrobbledb export --sql "SELECT artist_name, COUNT(*) as plays FROM plays GROUP BY artist_name" --format csv
```

## Configuration

scrobbledb follows the XDG Base Directory specification. By default, data is stored in:

- **Linux/Unix**: `~/.local/share/dev.pirateninja.scrobbledb/`
- **macOS**: `~/Library/Application Support/dev.pirateninja.scrobbledb/`
- **Windows**: `%LOCALAPPDATA%\dev.pirateninja.scrobbledb\`

You can override the database and auth file locations using command-line options:

```bash
uv run scrobbledb --database /path/to/custom.db ingest --auth /path/to/auth.json
```

## Development

### Python

scrobbledb uses modern Python development tools:

- **uv** - Fast Python package manager
- **ruff** - Fast Python linter and formatter
- **pytest** - Testing framework
- **poe** - Task runner for common development tasks

```bash
# Run tests
poe test

# Lint code
poe lint

# Type check
poe type

# Run all quality checks
poe qa
```

### Node.js

The Node.js port lives in `web/` and has no build step — it's plain CommonJS.

```bash
cd web
npm install        # install dependencies

# Verify CLI
node bin/scrobbledb.js --help

# Run tests (uses a temporary database)
node --test        # Node.js built-in test runner
```

## Agentic Coding Disclosure

Significant portions of this project were implemented through the use
of agentic coding tools such as Claude Code, GitHub Copilot Agent,
OpenAI Codex, and Gemini CLI. This was a specific goal intended to
explore and increase my proficiency with AI accelerated coding
practices. 

See [AGENTS.md](AGENTS.md) for detailed development guidelines.

## Contributing

**As mentioned above, this project is primarily "auditionware".** 

However, pull requests and issues are welcome, at least as criticism,
feedback, and inspiration! There might be a lag on responding or
acceptance though. You’re likely best off assuming that a PR will take
forever to be accepted if at all. Similarly for addressing issues. For
major changes, please open an issue first to discuss what you would
like to change.

## License

scrobbledb is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for the full license text.

Original lastfm-to-sqlite project by Jacob Kaplan-Moss, originally
under the [WTFPL][wtfpl] based upon his repository’s [`pyproject.toml`][jacobian-pyproject-toml]
file.

## Links

- **Repository**: https://github.com/crossjam/scrobbledb
- **Original Project**: https://github.com/jacobian/lastfm-to-sqlite
- **Last.fm API**: https://www.last.fm/api
- **Libre.fm**: https://libre.fm/

[wtfpl]: https://www.wtfpl.net
[jacobian-pyproject-toml]: https://github.com/jacobian/lastfm-to-sqlite/blob/8118b453b36142241618c484cf74c7916423f649/pyproject.toml
