/**
 * HTML page templates for the scrobbledb web interface.
 *
 * All pages are rendered server-side as plain HTML strings.
 * Styling is inline via a single shared CSS block — no build step, no
 * external assets, no JavaScript frameworks.
 */

// ─── Shared chrome ────────────────────────────────────────────────────────────

export const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;scroll-behavior:smooth}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column}
a{color:#7c9ef8;text-decoration:none}a:hover{text-decoration:underline;color:#a5bbff}
h1,h2,h3{font-weight:600;line-height:1.3}
nav{background:#1a1d27;border-bottom:1px solid #2a2d3e;padding:.75rem 1.5rem;display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap}
nav .brand{font-size:1.1rem;font-weight:700;color:#e2e8f0;white-space:nowrap}
nav .brand span{color:#7c9ef8}
nav a{color:#94a3b8;font-size:.875rem;padding:.25rem .5rem;border-radius:.25rem;transition:background .15s,color .15s}
nav a:hover,nav a.active{background:#2a2d3e;color:#e2e8f0;text-decoration:none}
.container{max-width:1200px;margin:0 auto;padding:1.5rem;flex:1}
.page-title{font-size:1.5rem;color:#e2e8f0;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem}
.page-title .icon{font-size:1.4rem}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-bottom:1.5rem}
.stat-card{background:#1a1d27;border:1px solid #2a2d3e;border-radius:.5rem;padding:1rem;text-align:center}
.stat-card .value{font-size:1.75rem;font-weight:700;color:#7c9ef8}
.stat-card .label{font-size:.8rem;color:#64748b;margin-top:.25rem;text-transform:uppercase;letter-spacing:.05em}
table{width:100%;border-collapse:collapse;font-size:.875rem}
thead tr{border-bottom:2px solid #2a2d3e}
thead th{text-align:left;padding:.6rem .75rem;color:#94a3b8;font-weight:600;text-transform:uppercase;font-size:.75rem;letter-spacing:.05em}
thead th.num{text-align:right}
tbody tr{border-bottom:1px solid #1e2132;transition:background .1s}
tbody tr:hover{background:#1e2132}
tbody td{padding:.6rem .75rem;color:#cbd5e1}
tbody td.num{text-align:right;font-variant-numeric:tabular-nums;color:#94a3b8}
tbody td.primary{color:#e2e8f0;font-weight:500}
tbody td.muted{color:#475569;font-size:.8rem}
.table-wrap{background:#1a1d27;border:1px solid #2a2d3e;border-radius:.5rem;overflow:hidden;margin-bottom:1rem}
.search-bar{display:flex;gap:.5rem;margin-bottom:1.25rem}
.search-bar input{flex:1;background:#1a1d27;border:1px solid #2a2d3e;border-radius:.375rem;padding:.5rem .75rem;color:#e2e8f0;font-size:.9rem;outline:none;transition:border-color .15s}
.search-bar input:focus{border-color:#7c9ef8}
.search-bar button,.btn{background:#7c9ef8;color:#0f1117;border:none;border-radius:.375rem;padding:.5rem 1rem;font-size:.875rem;font-weight:600;cursor:pointer;transition:background .15s;text-decoration:none;display:inline-block}
.search-bar button:hover,.btn:hover{background:#a5bbff}
.btn-outline{background:transparent;color:#7c9ef8;border:1px solid #7c9ef8}
.btn-outline:hover{background:#7c9ef8;color:#0f1117}
.btn-danger{background:#ef4444;color:#fff}
.btn-danger:hover{background:#dc2626}
.btn-success{background:#22c55e;color:#0f1117}
.btn-success:hover{background:#16a34a}
.pagination{display:flex;gap:.5rem;align-items:center;margin-top:1rem;justify-content:center}
.pagination a,.pagination span{padding:.4rem .75rem;border-radius:.375rem;font-size:.85rem;border:1px solid #2a2d3e;color:#94a3b8}
.pagination a:hover{background:#2a2d3e;color:#e2e8f0;text-decoration:none}
.pagination .current{background:#2a2d3e;color:#e2e8f0;border-color:#3a3d4e}
.badge{display:inline-block;padding:.15rem .5rem;border-radius:999px;font-size:.75rem;font-weight:600}
.badge-blue{background:#1e3a5f;color:#7c9ef8}
.badge-green{background:#14532d;color:#4ade80}
.badge-red{background:#7f1d1d;color:#fca5a5}
.empty{text-align:center;padding:3rem;color:#475569}
.empty .icon{font-size:2.5rem;margin-bottom:.75rem}
.empty p{font-size:.9rem}
.flash{padding:.75rem 1rem;border-radius:.375rem;margin-bottom:1rem;font-size:.875rem}
.flash-success{background:#14532d;color:#4ade80;border:1px solid #166534}
.flash-error{background:#7f1d1d;color:#fca5a5;border:1px solid #991b1b}
.flash-info{background:#1e3a5f;color:#7c9ef8;border:1px solid #1e40af}
form label{display:block;font-size:.8rem;color:#94a3b8;margin-bottom:.35rem;text-transform:uppercase;letter-spacing:.04em}
form input,form select{width:100%;background:#0f1117;border:1px solid #2a2d3e;border-radius:.375rem;padding:.5rem .75rem;color:#e2e8f0;font-size:.9rem;outline:none;margin-bottom:1rem;transition:border-color .15s}
form input:focus,form select:focus{border-color:#7c9ef8}
form input[type=password]{font-family:monospace}
.form-card{background:#1a1d27;border:1px solid #2a2d3e;border-radius:.5rem;padding:1.5rem;max-width:520px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.progress-bar-wrap{background:#1a1d27;border-radius:999px;overflow:hidden;height:.5rem;margin:.5rem 0}
.progress-bar{height:.5rem;background:#7c9ef8;border-radius:999px;transition:width .3s}
.ingest-status{background:#1a1d27;border:1px solid #2a2d3e;border-radius:.5rem;padding:1rem;margin-top:1rem;font-size:.875rem;color:#94a3b8;font-family:monospace;max-height:280px;overflow-y:auto}
footer{background:#1a1d27;border-top:1px solid #2a2d3e;padding:.75rem 1.5rem;font-size:.75rem;color:#475569;text-align:center}
.filter-bar{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;margin-bottom:1.25rem}
.filter-bar select{background:#1a1d27;border:1px solid #2a2d3e;border-radius:.375rem;padding:.4rem .6rem;color:#e2e8f0;font-size:.8rem;outline:none}
.filter-bar select:focus{border-color:#7c9ef8}
.filter-bar label{font-size:.8rem;color:#64748b}
@media(max-width:640px){.form-row{grid-template-columns:1fr}.stat-grid{grid-template-columns:1fr 1fr}}
`;

function navHtml(active: string): string {
  const links = [
    ["/", "Dashboard", "🏠"],
    ["/plays", "Plays", "🎵"],
    ["/artists", "Artists", "🎤"],
    ["/albums", "Albums", "💿"],
    ["/tracks", "Tracks", "🎼"],
    ["/stats", "Stats", "📊"],
    ["/search", "Search", "🔍"],
    ["/settings", "Settings", "⚙️"],
  ];
  return `<nav>
    <span class="brand">scrobble<span>db</span></span>
    ${links.map(([href, label, icon]) => `<a href="${href}"${href === active ? ' class="active"' : ''}>${icon} ${label}</a>`).join("")}
  </nav>`;
}

export function layout(opts: {
  title: string;
  active: string;
  body: string;
  flash?: { type: "success" | "error" | "info"; message: string };
}): string {
  const flashHtml = opts.flash
    ? `<div class="flash flash-${opts.flash.type}">${escHtml(opts.flash.message)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(opts.title)} — scrobbledb</title>
  <style>${CSS}</style>
</head>
<body>
  ${navHtml(opts.active)}
  <div class="container">
    ${flashHtml}
    ${opts.body}
  </div>
  <footer>
    scrobbledb — Bun.js port of
    <a href="https://github.com/jacobian/lastfm-to-sqlite" target="_blank" rel="noopener">lastfm-to-sqlite</a>
    by <a href="https://github.com/jacobian" target="_blank" rel="noopener">Jacob Kaplan-Moss</a>.
    Extended by <a href="https://github.com/crossjam" target="_blank" rel="noopener">Brian M. Dennis</a>.
    Ported to Bun.js with web interface by the scrobbledb contributors.
  </footer>
</body>
</html>`;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function escHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function paginationHtml(base: string, page: number, totalPages: number): string {
  if (totalPages <= 1) return "";
  const prev = page > 1 ? `<a href="${base}?page=${page - 1}">← Prev</a>` : `<span>← Prev</span>`;
  const next = page < totalPages ? `<a href="${base}?page=${page + 1}">Next →</a>` : `<span>Next →</span>`;
  return `<div class="pagination">${prev}<span class="current">${page} / ${totalPages}</span>${next}</div>`;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function renderDashboard(stats: Record<string, unknown>, topArtists: Record<string, unknown>[]): string {
  const body = `
    <h1 class="page-title"><span class="icon">🏠</span> Dashboard</h1>
    <div class="stat-grid">
      <div class="stat-card"><div class="value">${fmtNum(stats.total_scrobbles as number)}</div><div class="label">Total Plays</div></div>
      <div class="stat-card"><div class="value">${fmtNum(stats.unique_artists as number)}</div><div class="label">Artists</div></div>
      <div class="stat-card"><div class="value">${fmtNum(stats.unique_albums as number)}</div><div class="label">Albums</div></div>
      <div class="stat-card"><div class="value">${fmtNum(stats.unique_tracks as number)}</div><div class="label">Tracks</div></div>
    </div>
    ${stats.first_scrobble ? `<p style="color:#64748b;font-size:.85rem;margin-bottom:1.5rem">Listening history from <strong style="color:#94a3b8">${fmtDate(stats.first_scrobble as string)}</strong> to <strong style="color:#94a3b8">${fmtDate(stats.last_scrobble as string)}</strong></p>` : ""}
    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem">
      <a href="/ingest" class="btn btn-success">⬇ Import New Scrobbles</a>
      <a href="/search" class="btn btn-outline">🔍 Search</a>
    </div>
    ${topArtists.length > 0 ? `
    <h2 style="font-size:1rem;color:#94a3b8;margin-bottom:.75rem;text-transform:uppercase;letter-spacing:.05em">Top Artists (All Time)</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Artist</th><th class="num">Plays</th><th class="num">%</th></tr></thead>
        <tbody>
          ${topArtists.slice(0, 10).map((r, i) => `<tr>
            <td class="muted">${i + 1}</td>
            <td class="primary"><a href="/artists/${encodeURIComponent(String(r.artist_id))}">${escHtml(r.artist_name)}</a></td>
            <td class="num">${fmtNum(r.play_count as number)}</td>
            <td class="num">${(r.percentage as number).toFixed(1)}%</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <a href="/artists" style="font-size:.85rem">See all artists →</a>
    ` : `<div class="empty"><div class="icon">🎵</div><p>No data yet. <a href="/ingest">Import your listening history</a> to get started.</p></div>`}
  `;
  return layout({ title: "Dashboard", active: "/", body });
}

// ─── Artists ─────────────────────────────────────────────────────────────────

export function renderArtists(
  artists: Record<string, unknown>[],
  page: number,
  totalPages: number,
  sort: string,
  order: string,
): string {
  const sortOptions = [
    ["plays", "Most Played"],
    ["name", "Name A–Z"],
    ["recent", "Recently Played"],
  ];
  const filterBar = `
    <form method="get" action="/artists" class="filter-bar">
      <label>Sort by</label>
      <select name="sort" onchange="this.form.submit()">
        ${sortOptions.map(([v, l]) => `<option value="${v}"${sort === v ? " selected" : ""}>${l}</option>`).join("")}
      </select>
      <select name="order" onchange="this.form.submit()">
        <option value="desc"${order === "desc" ? " selected" : ""}>Descending</option>
        <option value="asc"${order === "asc" ? " selected" : ""}>Ascending</option>
      </select>
    </form>`;

  const rows = artists.map(r => `<tr>
    <td class="primary"><a href="/artists/${encodeURIComponent(String(r.artist_id))}">${escHtml(r.artist_name)}</a></td>
    <td class="num">${fmtNum(r.play_count as number)}</td>
    <td class="num">${fmtNum(r.album_count as number)}</td>
    <td class="num">${fmtNum(r.track_count as number)}</td>
    <td class="muted">${fmtDate(r.last_played as string)}</td>
  </tr>`).join("");

  const body = `
    <h1 class="page-title"><span class="icon">🎤</span> Artists</h1>
    ${filterBar}
    <div class="table-wrap">
      <table>
        <thead><tr><th>Artist</th><th class="num">Plays</th><th class="num">Albums</th><th class="num">Tracks</th><th>Last Played</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" class="empty">No artists found.</td></tr>`}</tbody>
      </table>
    </div>
    ${paginationHtml("/artists", page, totalPages)}
  `;
  return layout({ title: "Artists", active: "/artists", body });
}

export function renderArtistDetail(
  artist: Record<string, unknown>,
  topTracks: Record<string, unknown>[],
  albums: Record<string, unknown>[],
): string {
  const trackRows = topTracks.map(t => `<tr>
    <td class="primary"><a href="/tracks/${encodeURIComponent(String(t.track_id))}">${escHtml(t.track_title)}</a></td>
    <td>${escHtml(t.album_title)}</td>
    <td class="num">${fmtNum(t.play_count as number)}</td>
    <td class="muted">${fmtDate(t.last_played as string)}</td>
  </tr>`).join("");

  const albumRows = albums.map(a => `<tr>
    <td class="primary"><a href="/albums/${encodeURIComponent(String(a.album_id))}">${escHtml(a.album_title)}</a></td>
    <td class="num">${fmtNum(a.track_count as number)}</td>
    <td class="num">${fmtNum(a.play_count as number)}</td>
    <td class="muted">${fmtDate(a.last_played as string)}</td>
  </tr>`).join("");

  const body = `
    <h1 class="page-title"><span class="icon">🎤</span> ${escHtml(artist.artist_name)}</h1>
    <div class="stat-grid" style="max-width:600px">
      <div class="stat-card"><div class="value">${fmtNum(artist.play_count as number)}</div><div class="label">Plays</div></div>
      <div class="stat-card"><div class="value">${fmtNum(artist.album_count as number)}</div><div class="label">Albums</div></div>
      <div class="stat-card"><div class="value">${fmtNum(artist.track_count as number)}</div><div class="label">Tracks</div></div>
    </div>
    <h2 style="font-size:.9rem;color:#94a3b8;margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.05em">Top Tracks</h2>
    <div class="table-wrap" style="margin-bottom:1.5rem">
      <table><thead><tr><th>Track</th><th>Album</th><th class="num">Plays</th><th>Last Played</th></tr></thead>
      <tbody>${trackRows || `<tr><td colspan="4" class="empty">No tracks.</td></tr>`}</tbody></table>
    </div>
    <h2 style="font-size:.9rem;color:#94a3b8;margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.05em">Albums</h2>
    <div class="table-wrap">
      <table><thead><tr><th>Album</th><th class="num">Tracks</th><th class="num">Plays</th><th>Last Played</th></tr></thead>
      <tbody>${albumRows || `<tr><td colspan="4" class="empty">No albums.</td></tr>`}</tbody></table>
    </div>
    <a href="/artists" style="font-size:.85rem">← All artists</a>
  `;
  return layout({ title: String(artist.artist_name), active: "/artists", body });
}

// ─── Albums ───────────────────────────────────────────────────────────────────

export function renderAlbums(
  albums: Record<string, unknown>[],
  page: number,
  totalPages: number,
  sort: string,
  order: string,
): string {
  const filterBar = `
    <form method="get" action="/albums" class="filter-bar">
      <label>Sort by</label>
      <select name="sort" onchange="this.form.submit()">
        <option value="plays"${sort === "plays" ? " selected" : ""}>Most Played</option>
        <option value="title"${sort === "title" ? " selected" : ""}>Title A–Z</option>
        <option value="recent"${sort === "recent" ? " selected" : ""}>Recently Played</option>
      </select>
      <select name="order" onchange="this.form.submit()">
        <option value="desc"${order === "desc" ? " selected" : ""}>Descending</option>
        <option value="asc"${order === "asc" ? " selected" : ""}>Ascending</option>
      </select>
    </form>`;

  const rows = albums.map(r => `<tr>
    <td class="primary"><a href="/albums/${encodeURIComponent(String(r.album_id))}">${escHtml(r.album_title)}</a></td>
    <td><a href="/artists/${encodeURIComponent(String(r.artist_id))}">${escHtml(r.artist_name)}</a></td>
    <td class="num">${fmtNum(r.track_count as number)}</td>
    <td class="num">${fmtNum(r.play_count as number)}</td>
    <td class="muted">${fmtDate(r.last_played as string)}</td>
  </tr>`).join("");

  const body = `
    <h1 class="page-title"><span class="icon">💿</span> Albums</h1>
    ${filterBar}
    <div class="table-wrap">
      <table>
        <thead><tr><th>Album</th><th>Artist</th><th class="num">Tracks</th><th class="num">Plays</th><th>Last Played</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" class="empty">No albums found.</td></tr>`}</tbody>
      </table>
    </div>
    ${paginationHtml("/albums", page, totalPages)}
  `;
  return layout({ title: "Albums", active: "/albums", body });
}

export function renderAlbumDetail(
  album: Record<string, unknown>,
  tracks: Record<string, unknown>[],
): string {
  const rows = tracks.map(t => `<tr>
    <td class="primary"><a href="/tracks/${encodeURIComponent(String(t.track_id))}">${escHtml(t.track_title)}</a></td>
    <td class="num">${fmtNum(t.play_count as number)}</td>
    <td class="muted">${fmtDate(t.last_played as string)}</td>
  </tr>`).join("");

  const body = `
    <h1 class="page-title"><span class="icon">💿</span> ${escHtml(album.album_title)}</h1>
    <p style="color:#94a3b8;margin-bottom:1.25rem">by <a href="/artists/${encodeURIComponent(String(album.artist_id))}">${escHtml(album.artist_name)}</a></p>
    <div class="stat-grid" style="max-width:420px">
      <div class="stat-card"><div class="value">${fmtNum(album.play_count as number)}</div><div class="label">Plays</div></div>
      <div class="stat-card"><div class="value">${fmtNum(album.track_count as number)}</div><div class="label">Tracks</div></div>
    </div>
    <div class="table-wrap">
      <table><thead><tr><th>Track</th><th class="num">Plays</th><th>Last Played</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="3" class="empty">No tracks.</td></tr>`}</tbody></table>
    </div>
    <a href="/albums" style="font-size:.85rem">← All albums</a>
  `;
  return layout({ title: String(album.album_title), active: "/albums", body });
}

// ─── Tracks ───────────────────────────────────────────────────────────────────

export function renderTracks(
  tracks: Record<string, unknown>[],
  page: number,
  totalPages: number,
  sort: string,
  order: string,
): string {
  const filterBar = `
    <form method="get" action="/tracks" class="filter-bar">
      <label>Sort by</label>
      <select name="sort" onchange="this.form.submit()">
        <option value="plays"${sort === "plays" ? " selected" : ""}>Most Played</option>
        <option value="title"${sort === "title" ? " selected" : ""}>Title A–Z</option>
        <option value="recent"${sort === "recent" ? " selected" : ""}>Recently Played</option>
      </select>
      <select name="order" onchange="this.form.submit()">
        <option value="desc"${order === "desc" ? " selected" : ""}>Descending</option>
        <option value="asc"${order === "asc" ? " selected" : ""}>Ascending</option>
      </select>
    </form>`;

  const rows = tracks.map(r => `<tr>
    <td class="primary"><a href="/tracks/${encodeURIComponent(String(r.track_id))}">${escHtml(r.track_title)}</a></td>
    <td><a href="/artists/${encodeURIComponent(String(r.artist_id))}">${escHtml(r.artist_name)}</a></td>
    <td><a href="/albums/${encodeURIComponent(String(r.album_id))}">${escHtml(r.album_title)}</a></td>
    <td class="num">${fmtNum(r.play_count as number)}</td>
    <td class="muted">${fmtDate(r.last_played as string)}</td>
  </tr>`).join("");

  const body = `
    <h1 class="page-title"><span class="icon">🎼</span> Tracks</h1>
    ${filterBar}
    <div class="table-wrap">
      <table>
        <thead><tr><th>Track</th><th>Artist</th><th>Album</th><th class="num">Plays</th><th>Last Played</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" class="empty">No tracks found.</td></tr>`}</tbody>
      </table>
    </div>
    ${paginationHtml("/tracks", page, totalPages)}
  `;
  return layout({ title: "Tracks", active: "/tracks", body });
}

export function renderTrackDetail(
  track: Record<string, unknown>,
  plays: Record<string, unknown>[],
): string {
  const rows = plays.map(p => `<tr>
    <td class="muted">${fmtDate(p.timestamp as string)}</td>
    <td style="color:#475569;font-size:.8rem">${String(p.timestamp ?? "").slice(0, 19).replace("T", " ")}</td>
  </tr>`).join("");

  const body = `
    <h1 class="page-title"><span class="icon">🎼</span> ${escHtml(track.track_title)}</h1>
    <p style="color:#94a3b8;margin-bottom:.3rem">by <a href="/artists/${encodeURIComponent(String(track.artist_id))}">${escHtml(track.artist_name)}</a></p>
    <p style="color:#64748b;margin-bottom:1.25rem;font-size:.9rem">on <a href="/albums/${encodeURIComponent(String(track.album_id))}">${escHtml(track.album_title)}</a></p>
    <div class="stat-grid" style="max-width:260px">
      <div class="stat-card"><div class="value">${fmtNum(track.play_count as number)}</div><div class="label">Total Plays</div></div>
    </div>
    <h2 style="font-size:.9rem;color:#94a3b8;margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.05em">Play History</h2>
    <div class="table-wrap">
      <table><thead><tr><th>Date</th><th>Time (UTC)</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="2" class="empty">No plays recorded.</td></tr>`}</tbody></table>
    </div>
    <a href="/tracks" style="font-size:.85rem">← All tracks</a>
  `;
  return layout({ title: String(track.track_title), active: "/tracks", body });
}

// ─── Plays ────────────────────────────────────────────────────────────────────

export function renderPlays(
  plays: Record<string, unknown>[],
  page: number,
  totalPages: number,
): string {
  const rows = plays.map(p => `<tr>
    <td class="muted">${String(p.timestamp ?? "").slice(0, 19).replace("T", " ")}</td>
    <td class="primary"><a href="/tracks/${encodeURIComponent(String(p.track_id))}">${escHtml(p.track_title)}</a></td>
    <td><a href="/artists">${escHtml(p.artist_name)}</a></td>
    <td style="color:#64748b">${escHtml(p.album_title)}</td>
  </tr>`).join("");

  const body = `
    <h1 class="page-title"><span class="icon">🎵</span> Play History</h1>
    <div class="table-wrap">
      <table>
        <thead><tr><th>When (UTC)</th><th>Track</th><th>Artist</th><th>Album</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="empty">No plays yet. <a href="/ingest">Import your history</a>.</td></tr>`}</tbody>
      </table>
    </div>
    ${paginationHtml("/plays", page, totalPages)}
  `;
  return layout({ title: "Plays", active: "/plays", body });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function renderStats(
  overview: Record<string, unknown>,
  monthly: Record<string, unknown>[],
  yearly: Record<string, unknown>[],
): string {
  const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const monthRows = monthly.slice(0, 24).map(r => `<tr>
    <td class="muted">${r.year}</td>
    <td>${MONTHS[r.month as number] ?? r.month}</td>
    <td class="num">${fmtNum(r.scrobbles as number)}</td>
    <td class="num">${fmtNum(r.unique_artists as number)}</td>
    <td class="num">${fmtNum(r.unique_albums as number)}</td>
    <td class="num">${fmtNum(r.unique_tracks as number)}</td>
  </tr>`).join("");

  const yearRows = yearly.map(r => `<tr>
    <td class="primary">${r.year}</td>
    <td class="num">${fmtNum(r.scrobbles as number)}</td>
    <td class="num">${fmtNum(r.unique_artists as number)}</td>
    <td class="num">${fmtNum(r.unique_albums as number)}</td>
    <td class="num">${fmtNum(r.unique_tracks as number)}</td>
  </tr>`).join("");

  const body = `
    <h1 class="page-title"><span class="icon">📊</span> Statistics</h1>
    <div class="stat-grid">
      <div class="stat-card"><div class="value">${fmtNum(overview.total_scrobbles as number)}</div><div class="label">Total Plays</div></div>
      <div class="stat-card"><div class="value">${fmtNum(overview.unique_artists as number)}</div><div class="label">Artists</div></div>
      <div class="stat-card"><div class="value">${fmtNum(overview.unique_albums as number)}</div><div class="label">Albums</div></div>
      <div class="stat-card"><div class="value">${fmtNum(overview.unique_tracks as number)}</div><div class="label">Tracks</div></div>
    </div>
    <h2 style="font-size:.9rem;color:#94a3b8;margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.05em">By Year</h2>
    <div class="table-wrap" style="margin-bottom:1.5rem">
      <table><thead><tr><th>Year</th><th class="num">Plays</th><th class="num">Artists</th><th class="num">Albums</th><th class="num">Tracks</th></tr></thead>
      <tbody>${yearRows || `<tr><td colspan="5" class="empty">No data.</td></tr>`}</tbody></table>
    </div>
    <h2 style="font-size:.9rem;color:#94a3b8;margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.05em">By Month (last 24 months)</h2>
    <div class="table-wrap">
      <table><thead><tr><th>Year</th><th>Month</th><th class="num">Plays</th><th class="num">Artists</th><th class="num">Albums</th><th class="num">Tracks</th></tr></thead>
      <tbody>${monthRows || `<tr><td colspan="6" class="empty">No data.</td></tr>`}</tbody></table>
    </div>
  `;
  return layout({ title: "Statistics", active: "/stats", body });
}

// ─── Search ───────────────────────────────────────────────────────────────────

export function renderSearch(
  query: string,
  results: Record<string, unknown>[],
): string {
  const rows = results.map(r => `<tr>
    <td class="primary"><a href="/tracks/${encodeURIComponent(String(r.track_id))}">${escHtml(r.track_title)}</a></td>
    <td><a href="/artists/${encodeURIComponent(String(r.artist_id))}">${escHtml(r.artist_name)}</a></td>
    <td><a href="/albums/${encodeURIComponent(String(r.album_id))}">${escHtml(r.album_title)}</a></td>
    <td class="num">${fmtNum(r.play_count as number)}</td>
  </tr>`).join("");

  const body = `
    <h1 class="page-title"><span class="icon">🔍</span> Search</h1>
    <form method="get" action="/search" class="search-bar">
      <input name="q" value="${escHtml(query)}" placeholder="Search artists, albums, tracks…" autofocus>
      <button type="submit">Search</button>
    </form>
    ${query ? `
    <p style="font-size:.85rem;color:#64748b;margin-bottom:.75rem">${results.length} result(s) for <strong style="color:#94a3b8">"${escHtml(query)}"</strong></p>
    <div class="table-wrap">
      <table><thead><tr><th>Track</th><th>Artist</th><th>Album</th><th class="num">Plays</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4" class="empty">No results found.</td></tr>`}</tbody></table>
    </div>` : ""}
  `;
  return layout({ title: "Search", active: "/search", body });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function renderSettings(
  current: {
    network: string;
    username: string;
    hasCredentials: boolean;
  },
  flash?: { type: "success" | "error" | "info"; message: string },
): string {
  const body = `
    <h1 class="page-title"><span class="icon">⚙️</span> Settings</h1>
    <div class="form-card" style="margin-bottom:1.5rem">
      <h2 style="font-size:1rem;margin-bottom:1rem;color:#94a3b8">API Credentials</h2>
      ${current.hasCredentials ? `<div class="flash flash-success" style="margin-bottom:1rem">✓ Credentials configured for <strong>${escHtml(current.username)}</strong> on <strong>${escHtml(current.network === "librefm" ? "Libre.fm" : "Last.fm")}</strong></div>` : `<div class="flash flash-info" style="margin-bottom:1rem">No credentials configured yet.</div>`}
      <form method="post" action="/settings/auth">
        <label>Network</label>
        <select name="network">
          <option value="lastfm"${current.network !== "librefm" ? " selected" : ""}>Last.fm</option>
          <option value="librefm"${current.network === "librefm" ? " selected" : ""}>Libre.fm</option>
        </select>
        <label>Username</label>
        <input name="username" value="${escHtml(current.username)}" placeholder="your username" required>
        <label>API Key</label>
        <input name="api_key" placeholder="API key" required>
        <label>Shared Secret</label>
        <input name="shared_secret" placeholder="shared secret" required>
        <label>Password</label>
        <input type="password" name="password" placeholder="your password" required>
        <p style="font-size:.8rem;color:#475569;margin-bottom:1rem">
          Get Last.fm API credentials at <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener">last.fm/api/account/create</a><br>
          Get Libre.fm API credentials at <a href="https://libre.fm/api/account/create" target="_blank" rel="noopener">libre.fm/api/account/create</a>
        </p>
        <button type="submit" class="btn">Save &amp; Authenticate</button>
      </form>
    </div>
  `;
  return layout({ title: "Settings", active: "/settings", body, flash });
}

// ─── Ingest ───────────────────────────────────────────────────────────────────

export function renderIngest(
  hasCredentials: boolean,
  latestTimestamp: string | null,
  flash?: { type: "success" | "error" | "info"; message: string },
): string {
  const body = `
    <h1 class="page-title"><span class="icon">⬇</span> Import Scrobbles</h1>
    ${!hasCredentials ? `<div class="flash flash-error">No credentials configured. <a href="/settings">Go to Settings</a> to add your API credentials first.</div>` : ""}
    <div class="form-card">
      ${latestTimestamp ? `<p style="color:#64748b;font-size:.85rem;margin-bottom:1rem">Last import: <strong style="color:#94a3b8">${latestTimestamp.slice(0, 19).replace("T", " ")} UTC</strong></p>` : `<p style="color:#64748b;font-size:.85rem;margin-bottom:1rem">No previous import — will fetch full history.</p>`}
      <form method="post" action="/ingest" id="ingest-form">
        <div class="form-row">
          <div>
            <label>From (optional)</label>
            <input name="since" type="date" placeholder="YYYY-MM-DD">
          </div>
          <div>
            <label>Until (optional)</label>
            <input name="until" type="date" placeholder="YYYY-MM-DD">
          </div>
        </div>
        <label>Max scrobbles (leave blank for all)</label>
        <input name="limit" type="number" min="1" placeholder="e.g. 1000">
        <button type="submit" class="btn btn-success"${!hasCredentials ? " disabled" : ""}>⬇ Start Import</button>
      </form>
    </div>
    <div id="ingest-log" style="display:none">
      <h2 style="font-size:.9rem;color:#94a3b8;margin:.75rem 0 .4rem;text-transform:uppercase;letter-spacing:.05em">Import Log</h2>
      <div class="ingest-status" id="ingest-output"></div>
    </div>
    <script>
      const form = document.getElementById('ingest-form');
      const logBox = document.getElementById('ingest-log');
      const output = document.getElementById('ingest-output');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        logBox.style.display = 'block';
        output.textContent = 'Starting import…\\n';
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        btn.textContent = '⏳ Importing…';
        const body = new URLSearchParams(Object.fromEntries(new FormData(form)));
        try {
          const res = await fetch('/ingest', { method: 'POST', body });
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            output.textContent += dec.decode(value);
            output.scrollTop = output.scrollHeight;
          }
        } catch(err) {
          output.textContent += '\\nError: ' + (err instanceof Error ? err.message : String(err));
        } finally {
          btn.disabled = false;
          btn.textContent = '⬇ Start Import';
        }
      });
    </script>
  `;
  return layout({ title: "Import Scrobbles", active: "/", body, flash });
}
