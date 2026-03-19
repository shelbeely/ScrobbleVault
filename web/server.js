'use strict';

const express = require('express');
const path = require('path');
const os = require('os');
const db = require('./db');

const CLI_ARGS = process.argv.slice(2);

// ── Resolve database path ────────────────────────────────────────────────────
function resolveDbPath() {
  const dbFlagIdx = CLI_ARGS.findIndex(a => a === '--db');
  if (dbFlagIdx !== -1 && CLI_ARGS[dbFlagIdx + 1]) {
    return path.resolve(CLI_ARGS[dbFlagIdx + 1]);
  }
  if (process.env.SCROBBLEDB_PATH) return path.resolve(process.env.SCROBBLEDB_PATH);
  return path.join(
    os.homedir(),
    '.local', 'share', 'dev.pirateninja.scrobbledb', 'scrobbledb.db'
  );
}

// ── Help flag ────────────────────────────────────────────────────────────────
if (CLI_ARGS.includes('--help') || CLI_ARGS.includes('-h')) {
  console.log(`
scrobbledb web interface

Usage:
  node server.js [--db <path>] [--port <port>]

Options:
  --db <path>   Path to the scrobbledb SQLite database
                (default: ~/.local/share/dev.pirateninja.scrobbledb/scrobbledb.db)
  --port <n>    Port to listen on (default: 3000, or PORT env var)
  --help        Show this help

Environment variables:
  SCROBBLEDB_PATH   Database path (overridden by --db)
  PORT              Port to listen on (overridden by --port)
`);
  process.exit(0);
}

const dbPath = resolveDbPath();
db.init(dbPath);
console.log(`Database: ${db.isAvailable() ? dbPath : `NOT FOUND at ${dbPath}`}`);

// ── Port ─────────────────────────────────────────────────────────────────────
const portFlagIdx = CLI_ARGS.findIndex(a => a === '--port');
const rawPort = (portFlagIdx !== -1 && CLI_ARGS[portFlagIdx + 1])
  ? parseInt(CLI_ARGS[portFlagIdx + 1], 10)
  : parseInt(process.env.PORT || '3000', 10);
const PORT = (Number.isInteger(rawPort) && rawPort >= 1 && rawPort <= 65535) ? rawPort : 3000;

// ── Templates ────────────────────────────────────────────────────────────────
function layout({ title, body, activePage = '' }) {
  const navLink = (href, label, page) =>
    `<a href="${href}"${activePage === page ? ' class="active"' : ''}>${label}</a>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)} – scrobbledb</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<nav>
  <a class="nav-brand" href="/">🎵 scrobbledb</a>
  <div class="nav-links">
    ${navLink('/', 'Home', 'home')}
    ${navLink('/artists', 'Artists', 'artists')}
    ${navLink('/albums', 'Albums', 'albums')}
    ${navLink('/tracks', 'Tracks', 'tracks')}
    ${navLink('/search', 'Search', 'search')}
  </div>
  <form class="nav-search" action="/search" method="get">
    <input type="text" name="q" placeholder="Search tracks…" aria-label="Quick search">
    <button type="submit">Go</button>
  </form>
</nav>
<main>${body}</main>
<footer>Based on <strong>scrobbledb</strong> by Brian M. Dennis, originally inspired by <strong>lastfm-to-sqlite</strong> by Jacob Kaplan-Moss</footer>
</body>
</html>`;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function noDbAlert() {
  return `<div class="alert">
    <strong>No database found</strong>
    Could not open the database at <code>${escHtml(dbPath)}</code>.<br><br>
    Start the server with:<br>
    <code>node server.js --db /path/to/scrobbledb.db</code>
    &nbsp;or&nbsp;
    <code>SCROBBLEDB_PATH=/path/to/scrobbledb.db node server.js</code>
  </div>`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  try { return new Date(Number(ts) * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return ts; }
}

function fmtNum(n) {
  return Number(n).toLocaleString();
}

function paginationHtml(baseUrl, page, total, limit) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return '';
  const sep = baseUrl.includes('?') ? '&' : '?';
  let html = '<div class="pagination">';
  if (page > 1) html += `<a href="${baseUrl}${sep}page=${page - 1}">← Prev</a>`;
  html += `<span class="current">Page ${page} of ${totalPages}</span>`;
  if (page < totalPages) html += `<a href="${baseUrl}${sep}page=${page + 1}">Next →</a>`;
  html += '</div>';
  return html;
}

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// ── HTML Routes ───────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  if (!db.isAvailable()) {
    return res.send(layout({ title: 'Home', activePage: 'home', body: `
      <h1>🎵 scrobbledb</h1>
      <p style="color:var(--text-muted);margin-bottom:2rem">Browse your Last.fm listening history.</p>
      ${noDbAlert()}
    ` }));
  }
  const stats = db.getStats();
  const body = `
    <h1>🎵 scrobbledb</h1>
    <p style="color:var(--text-muted);margin-bottom:2rem">Browse your Last.fm listening history.</p>
    <div class="stats-grid">
      <div class="stat-card">
        <span class="value">${fmtNum(stats.total_scrobbles)}</span>
        <span class="label">Total Scrobbles</span>
      </div>
      <div class="stat-card">
        <span class="value">${fmtNum(stats.unique_artists)}</span>
        <span class="label">Artists</span>
      </div>
      <div class="stat-card">
        <span class="value">${fmtNum(stats.unique_albums)}</span>
        <span class="label">Albums</span>
      </div>
      <div class="stat-card">
        <span class="value">${fmtNum(stats.unique_tracks)}</span>
        <span class="label">Tracks</span>
      </div>
      <div class="stat-card wide">
        <span class="value">${fmtDate(stats.first_scrobble)} – ${fmtDate(stats.last_scrobble)}</span>
        <span class="label">Scrobble Date Range</span>
      </div>
    </div>
    <p style="color:var(--text-muted);font-size:0.9rem">
      Explore your history: <a href="/artists">Top Artists</a> ·
      <a href="/albums">Top Albums</a> · <a href="/tracks">Top Tracks</a> · <a href="/search">Search</a>
    </p>`;
  res.send(layout({ title: 'Home', activePage: 'home', body }));
});

app.get('/artists', (req, res) => {
  const limit = 50;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const offset = (page - 1) * limit;

  if (!db.isAvailable()) {
    return res.send(layout({ title: 'Artists', activePage: 'artists', body: `<h1>Top Artists</h1>${noDbAlert()}` }));
  }
  const stats = db.getStats();
  const rows = db.getTopArtists({ limit, offset });
  const rows_html = rows.map((r, i) => `
    <tr>
      <td class="rank">${offset + i + 1}</td>
      <td>${escHtml(r.name)}</td>
      <td>${fmtNum(r.play_count)}</td>
    </tr>`).join('');

  const body = `
    <h1>Top Artists</h1>
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Artist</th><th>Plays</th></tr></thead>
        <tbody>${rows_html || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No data</td></tr>'}</tbody>
      </table>
    </div>
    ${paginationHtml('/artists', page, stats.unique_artists, limit)}`;
  res.send(layout({ title: 'Artists', activePage: 'artists', body }));
});

app.get('/albums', (req, res) => {
  const limit = 50;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const offset = (page - 1) * limit;

  if (!db.isAvailable()) {
    return res.send(layout({ title: 'Albums', activePage: 'albums', body: `<h1>Top Albums</h1>${noDbAlert()}` }));
  }
  const stats = db.getStats();
  const rows = db.getTopAlbums({ limit, offset });
  const rows_html = rows.map((r, i) => `
    <tr>
      <td class="rank">${offset + i + 1}</td>
      <td>${escHtml(r.title)}<br><span class="muted">${escHtml(r.artist_name)}</span></td>
      <td>${fmtNum(r.play_count)}</td>
    </tr>`).join('');

  const body = `
    <h1>Top Albums</h1>
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Album</th><th>Plays</th></tr></thead>
        <tbody>${rows_html || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No data</td></tr>'}</tbody>
      </table>
    </div>
    ${paginationHtml('/albums', page, stats.unique_albums, limit)}`;
  res.send(layout({ title: 'Albums', activePage: 'albums', body }));
});

app.get('/tracks', (req, res) => {
  const limit = 50;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const offset = (page - 1) * limit;

  if (!db.isAvailable()) {
    return res.send(layout({ title: 'Tracks', activePage: 'tracks', body: `<h1>Top Tracks</h1>${noDbAlert()}` }));
  }
  const stats = db.getStats();
  const rows = db.getTopTracks({ limit, offset });
  const rows_html = rows.map((r, i) => `
    <tr>
      <td class="rank">${offset + i + 1}</td>
      <td>${escHtml(r.title)}<br><span class="muted">${escHtml(r.artist_name)} · ${escHtml(r.album_title)}</span></td>
      <td>${fmtNum(r.play_count)}</td>
    </tr>`).join('');

  const body = `
    <h1>Top Tracks</h1>
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Track</th><th>Plays</th></tr></thead>
        <tbody>${rows_html || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No data</td></tr>'}</tbody>
      </table>
    </div>
    ${paginationHtml('/tracks', page, stats.unique_tracks, limit)}`;
  res.send(layout({ title: 'Tracks', activePage: 'tracks', body }));
});

app.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();

  if (!db.isAvailable()) {
    return res.send(layout({ title: 'Search', activePage: 'search', body: `<h1>Search</h1>${noDbAlert()}` }));
  }

  let resultsHtml = '';
  if (q) {
    const results = db.search(q);
    const rows_html = results.map(r => `
      <tr>
        <td>${escHtml(r.title)}</td>
        <td>${escHtml(r.artist_name)}</td>
        <td>${escHtml(r.album_title)}</td>
      </tr>`).join('');
    resultsHtml = `
      <p class="search-meta">${results.length} result${results.length !== 1 ? 's' : ''} for "<strong>${escHtml(q)}</strong>"</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Track</th><th>Artist</th><th>Album</th></tr></thead>
          <tbody>${rows_html || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No results found</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  const body = `
    <h1>Search</h1>
    <form class="search-box" action="/search" method="get">
      <input type="text" name="q" value="${escHtml(q)}" placeholder="Search tracks, artists, albums…" autofocus>
      <button type="submit">Search</button>
    </form>
    ${resultsHtml}`;
  res.send(layout({ title: 'Search', activePage: 'search', body }));
});

// ── JSON API Routes ────────────────────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
  if (!db.isAvailable()) return res.status(503).json({ error: 'Database not available', path: dbPath });
  res.json(db.getStats());
});

app.get('/api/artists', (req, res) => {
  if (!db.isAvailable()) return res.status(503).json({ error: 'Database not available' });
  const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
  const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
  res.json(db.getTopArtists({ limit, offset }));
});

app.get('/api/albums', (req, res) => {
  if (!db.isAvailable()) return res.status(503).json({ error: 'Database not available' });
  const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
  const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
  res.json(db.getTopAlbums({ limit, offset }));
});

app.get('/api/tracks', (req, res) => {
  if (!db.isAvailable()) return res.status(503).json({ error: 'Database not available' });
  const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
  const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
  res.json(db.getTopTracks({ limit, offset }));
});

app.get('/api/search', (req, res) => {
  if (!db.isAvailable()) return res.status(503).json({ error: 'Database not available' });
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
  res.json(db.search(q, { limit }));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
