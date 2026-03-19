/**
 * HTML page templates for the scrobbledb web interface.
 *
 * All pages are rendered server-side as plain HTML strings.
 * Styling is inline via a single shared CSS block — no build step, no
 * external assets, no JavaScript frameworks.
 */

import type { WrappedYear } from "../queries";

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
/* ── Brain / Universe / Timeline / Taste ── */
.brain-hero{background:linear-gradient(135deg,#1a1d27 0%,#0f1117 100%);border:1px solid #2a2d3e;border-radius:.75rem;padding:1.5rem;margin-bottom:1.25rem}
.brain-era{font-size:1.1rem;color:#a5bbff;font-style:italic;margin-bottom:1rem}
.cluster-chips{display:flex;flex-wrap:wrap;gap:.5rem;margin:.75rem 0}
.cluster-chip{padding:.35rem .75rem;border-radius:999px;font-size:.8rem;font-weight:600;opacity:.9}
.explore-links{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.25rem}
.explore-card{background:#1a1d27;border:1px solid #2a2d3e;border-radius:.5rem;padding:1rem 1.25rem;text-align:center;flex:1;min-width:140px;transition:border-color .15s,transform .15s;cursor:pointer;text-decoration:none;display:block;color:#e2e8f0}
.explore-card:hover{border-color:#7c9ef8;transform:translateY(-2px);text-decoration:none;color:#e2e8f0}
.explore-card .ec-icon{font-size:1.8rem;display:block;margin-bottom:.4rem}
.explore-card .ec-label{font-size:.8rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
.explore-card .ec-title{font-size:.95rem;font-weight:600;margin-top:.15rem}
#universe-wrap{position:relative;background:#1a1d27;border:1px solid #2a2d3e;border-radius:.5rem;overflow:hidden}
#universe-canvas{display:block;width:100%;cursor:grab}
#universe-canvas:active{cursor:grabbing}
#universe-tooltip{position:fixed;background:#0f1117;border:1px solid #2a2d3e;border-radius:.375rem;padding:.6rem .85rem;font-size:.8rem;pointer-events:none;display:none;z-index:100;max-width:200px;line-height:1.5}
.universe-legend{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem;font-size:.75rem}
.universe-legend span{display:flex;align-items:center;gap:.35rem;color:#94a3b8}
.universe-legend i{width:10px;height:10px;border-radius:50%;display:inline-block}
.heatmap-outer{overflow-x:auto;padding-bottom:.5rem}
.heatmap-year-label{font-size:.85rem;color:#64748b;margin-bottom:.4rem;font-weight:600}
.heatmap-months{display:grid;grid-auto-flow:column;grid-auto-columns:14px;gap:2px;margin-bottom:2px;font-size:.65rem;color:#475569;height:14px}
.heatmap-grid{display:grid;grid-template-rows:repeat(7,12px);grid-auto-flow:column;grid-auto-columns:12px;gap:2px}
.heatmap-cell{width:12px;height:12px;border-radius:2px;cursor:default;transition:opacity .1s}
.heatmap-cell:hover{opacity:.7;outline:1px solid #7c9ef8}
.taste-compare{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem}
.taste-col h3{font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:.6rem}
.taste-bar-wrap{margin-bottom:.35rem}
.taste-bar-label{display:flex;justify-content:space-between;font-size:.8rem;color:#94a3b8;margin-bottom:.15rem}
.taste-bar-track{background:#1e2132;border-radius:999px;height:6px;overflow:hidden}
.taste-bar-fill{height:6px;border-radius:999px;background:#7c9ef8;transition:width .4s}
.drift-chip{display:inline-block;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:500;margin:.2rem .15rem}
.drift-new{background:#14532d;color:#4ade80}
.drift-away{background:#431407;color:#fb923c}
.era-card{background:linear-gradient(135deg,#1e3a5f,#1a1d27);border:1px solid #1e40af;border-radius:.75rem;padding:1.5rem;margin-bottom:1.25rem}
.era-label{font-size:1.4rem;font-weight:700;color:#a5bbff;margin-bottom:.35rem}
.consistency-ring{display:inline-flex;align-items:center;gap:.75rem;background:#0f1117;border:1px solid #2a2d3e;border-radius:.5rem;padding:.6rem 1rem;font-size:.85rem;color:#94a3b8}
.consistency-ring .score{font-size:1.4rem;font-weight:700;color:#7c9ef8}
.btn-sm{padding:.3rem .75rem !important;font-size:.75rem !important}
/* ── Wrapped ── */
.wrapped-hero{background:linear-gradient(135deg,#1a1d27 0%,#0f1117 60%,#1e1030 100%);border:1px solid #2a2d3e;border-radius:.75rem;padding:2rem;margin-bottom:1.5rem;position:relative;overflow:hidden}
.wrapped-hero::before{content:'';position:absolute;top:-40px;right:-40px;width:200px;height:200px;background:radial-gradient(circle,#7c9ef822 0%,transparent 70%);pointer-events:none}
.wrapped-year-nav{display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap}
.wrapped-year-nav a,.wrapped-year-nav span{display:inline-block;padding:.35rem .9rem;border-radius:.375rem;font-size:.85rem;border:1px solid #2a2d3e;color:#94a3b8;text-decoration:none;transition:background .15s,color .15s}
.wrapped-year-nav a:hover{background:#2a2d3e;color:#e2e8f0;text-decoration:none}
.wrapped-year-nav .current-year{background:#7c9ef8;color:#0f1117;border-color:#7c9ef8;font-weight:700}
.wrapped-big-num{font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;color:#e2e8f0;line-height:1;letter-spacing:-.03em}
.wrapped-big-label{font-size:.9rem;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-top:.25rem}
.wrapped-hero-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1.5rem;margin-top:1.5rem}
.wrapped-section{background:#1a1d27;border:1px solid #2a2d3e;border-radius:.5rem;padding:1.25rem;margin-bottom:1.25rem}
.wrapped-section-title{font-size:.75rem;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:1rem;display:flex;align-items:center;gap:.4rem}
.wrapped-rank-list{display:flex;flex-direction:column;gap:.6rem}
.wrapped-rank-item{display:flex;align-items:center;gap:.75rem}
.wrapped-rank-num{font-size:1.5rem;font-weight:800;color:#2a2d3e;min-width:1.8rem;text-align:right;line-height:1}
.wrapped-rank-num.top1{color:#f8c97c}
.wrapped-rank-num.top2{color:#94a3b8}
.wrapped-rank-num.top3{color:#b87333}
.wrapped-rank-bar-wrap{flex:1;min-width:0}
.wrapped-rank-name{font-size:.9rem;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.2rem}
.wrapped-rank-sub{font-size:.75rem;color:#64748b}
.wrapped-rank-bar{height:4px;border-radius:999px;background:#7c9ef8;margin-top:.25rem;transition:width .6s}
.wrapped-rank-count{font-size:.85rem;font-weight:600;color:#94a3b8;white-space:nowrap}
.wrapped-chart-bar{fill:#7c9ef8;transition:opacity .2s}
.wrapped-chart-bar:hover{opacity:.7}
.wrapped-milestone{background:#0f1117;border:1px solid #2a2d3e;border-radius:.5rem;padding:.75rem 1rem;display:flex;align-items:flex-start;gap:.75rem}
.wrapped-milestone-icon{font-size:1.4rem;line-height:1;flex-shrink:0}
.wrapped-milestone-text{font-size:.85rem;color:#94a3b8;line-height:1.5}
.wrapped-milestone-text strong{color:#e2e8f0}
.wrapped-milestones{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem;margin-bottom:1.25rem}
@media(max-width:640px){.form-row{grid-template-columns:1fr}.stat-grid{grid-template-columns:1fr 1fr}.taste-compare{grid-template-columns:1fr}.wrapped-hero-grid{grid-template-columns:1fr 1fr}}
`;

function navHtml(active: string): string {
  const links = [
    ["/", "Brain", "🧠"],
    ["/wrapped", "Wrapped", "🎁"],
    ["/universe", "Universe", "🌌"],
    ["/timeline", "Timeline", "📅"],
    ["/taste", "Taste DNA", "🧬"],
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

// ─── Brain (enhanced dashboard) ──────────────────────────────────────────────

const CLUSTER_COLORS = [
  "#7c9ef8","#f87c9e","#9ef87c","#f8c97c",
  "#c47cf8","#7cf8e6","#f87c7c","#f8f07c","#f89e7c","#7ca8f8",
];

export function renderDashboard(
  stats: Record<string, unknown>,
  topArtists: Record<string, unknown>[],
  streak?: { current_streak: number; longest_streak: number; total_days_listened: number; total_active_weeks: number },
  thisYear?: number,
  thisMonth?: number,
  genreClusters?: { id: number; topArtist: string; artists: string[]; plays: number }[],
): string {
  const streakData = streak ?? { current_streak: 0, longest_streak: 0, total_days_listened: 0, total_active_weeks: 0 };

  // Genre cluster chips — dynamic groups derived from co-listening patterns
  const clusterSection = genreClusters && genreClusters.length > 0 ? (() => {
    const chips = genreClusters.map((c, i) => {
      const color   = CLUSTER_COLORS[i % CLUSTER_COLORS.length]!;
      // Show up to 3 artist names from the cluster for richer label
      const preview = c.artists.slice(0, 3).map(a => escHtml(a)).join(" · ");
      const extra   = c.artists.length > 3 ? ` +${c.artists.length - 3}` : "";
      const title   = c.artists.map(a => escHtml(a)).join(", ");
      return `<span class="cluster-chip" style="background:${color}22;color:${color};border:1px solid ${color}44;max-width:none" title="${title}">${preview}${extra}</span>`;
    }).join("");
    return `
      <p style="font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">🎵 Your Genre Clusters <span style="font-weight:400;color:#334155;text-transform:none;letter-spacing:0">(dynamic · based on your listening)</span></p>
      <div class="cluster-chips" style="flex-direction:column;align-items:flex-start">${chips}</div>`;
  })() : (topArtists.length > 0 ? (() => {
    // Fallback: individual top-artist chips when no graph data available
    const chips = topArtists.slice(0, 6).map((a, i) => {
      const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length]!;
      return `<span class="cluster-chip" style="background:${color}22;color:${color};border:1px solid ${color}44">${escHtml(a.artist_name as string)}</span>`;
    }).join("");
    return `
      <p style="font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">Your Taste Identity</p>
      <div class="cluster-chips">${chips}</div>`;
  })() : "");

  const body = `
    <div class="brain-hero">
      <h1 style="font-size:1.6rem;font-weight:700;margin-bottom:.25rem">🧠 Your Music Brain</h1>
      ${stats.first_scrobble
        ? `<p class="brain-era">Listening since <strong style="color:#e2e8f0">${fmtDate(stats.first_scrobble as string)}</strong></p>`
        : `<p class="brain-era">No data yet — <a href="/ingest">import your history</a> to get started.</p>`}
      <div class="stat-grid" style="margin-bottom:.75rem">
        <div class="stat-card"><div class="value">${fmtNum(stats.total_scrobbles as number)}</div><div class="label">Lifetime Plays</div></div>
        <div class="stat-card"><div class="value">${fmtNum(thisYear ?? 0)}</div><div class="label">This Year</div></div>
        <div class="stat-card"><div class="value">${fmtNum(thisMonth ?? 0)}</div><div class="label">This Month</div></div>
        <div class="stat-card"><div class="value">${fmtNum(stats.unique_artists as number)}</div><div class="label">Unique Artists</div></div>
        <div class="stat-card"><div class="value">${fmtNum(stats.unique_albums as number)}</div><div class="label">Albums</div></div>
        <div class="stat-card"><div class="value">${fmtNum(stats.unique_tracks as number)}</div><div class="label">Tracks</div></div>
      </div>
      <div class="stat-grid" style="margin-bottom:.75rem">
        <div class="stat-card"><div class="value" style="color:#4ade80">${streakData.current_streak}</div><div class="label">🔥 Day Streak</div></div>
        <div class="stat-card"><div class="value">${streakData.longest_streak}</div><div class="label">Longest Streak</div></div>
        <div class="stat-card"><div class="value">${fmtNum(streakData.total_days_listened)}</div><div class="label">Days Active</div></div>
        <div class="stat-card"><div class="value">${fmtNum(streakData.total_active_weeks)}</div><div class="label">Weeks Active</div></div>
      </div>
      ${clusterSection}
    </div>

    <div class="explore-links" style="margin-bottom:1.5rem">
      <a href="/wrapped" class="explore-card">
        <span class="ec-icon">🎁</span>
        <div class="ec-label">Every Year, Forever</div>
        <div class="ec-title">Wrapped</div>
      </a>
      <a href="/universe" class="explore-card">
        <span class="ec-icon">🌌</span>
        <div class="ec-label">Killer Feature</div>
        <div class="ec-title">Artist Universe Map</div>
      </a>
      <a href="/timeline" class="explore-card">
        <span class="ec-icon">📅</span>
        <div class="ec-label">Listening History</div>
        <div class="ec-title">Timeline Heatmap</div>
      </a>
      <a href="/taste" class="explore-card">
        <span class="ec-icon">🧬</span>
        <div class="ec-label">Who You Are</div>
        <div class="ec-title">Taste DNA</div>
      </a>
      <a href="/ingest" class="explore-card">
        <span class="ec-icon">⬇</span>
        <div class="ec-label">Stay Up to Date</div>
        <div class="ec-title">Import Scrobbles</div>
      </a>
    </div>

    ${topArtists.length > 0 ? `
    <h2 style="font-size:.85rem;color:#64748b;margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.05em">Top Artists (All Time)</h2>
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
    ` : ""}
  `;
  return layout({ title: "Music Brain", active: "/", body });
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
      <form method="post" action="/settings/auth" id="settings-form">
        <label>Network</label>
        <select name="network" id="network-select" onchange="updateNetworkHelp()">
          <option value="lastfm"${current.network !== "librefm" ? " selected" : ""}>Last.fm</option>
          <option value="librefm"${current.network === "librefm" ? " selected" : ""}>Libre.fm</option>
        </select>
        <label>Username</label>
        <input name="username" value="${escHtml(current.username)}" placeholder="your username" required>
        <label>API Key</label>
        <input name="api_key" id="api-key-input" placeholder="API key" required>
        <label>Shared Secret</label>
        <input name="shared_secret" placeholder="shared secret" required>
        <label>Password</label>
        <input type="password" name="password" placeholder="your password" required>
        <div id="help-lastfm" style="font-size:.8rem;color:#475569;margin-bottom:1rem">
          Get your Last.fm API credentials at <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener">last.fm/api/account/create</a>
        </div>
        <div id="help-librefm" style="font-size:.8rem;color:#475569;margin-bottom:1rem;display:none">
          Libre.fm does not require API key registration. You may <strong style="color:#94a3b8">invent any 32-character string</strong> as your API key and shared secret — they are not validated beyond length.
          See the <a href="https://github.com/libre-fm/developer/wiki/Libre.fm-fundamentals" target="_blank" rel="noopener">Libre.fm developer docs</a> for details.
        </div>
        <button type="submit" class="btn">Save &amp; Authenticate</button>
      </form>
      <script>
        function updateNetworkHelp() {
          var net = document.getElementById('network-select').value;
          document.getElementById('help-lastfm').style.display  = net === 'lastfm'  ? '' : 'none';
          document.getElementById('help-librefm').style.display = net === 'librefm' ? '' : 'none';
          var keyInput = document.getElementById('api-key-input');
          if (net === 'librefm') {
            keyInput.maxLength = 32;
            keyInput.minLength = 32;
            keyInput.placeholder = '32-character API key (you can make one up)';
          } else {
            keyInput.removeAttribute('maxlength');
            keyInput.removeAttribute('minlength');
            keyInput.placeholder = 'API key';
          }
        }
        updateNetworkHelp();
      </script>
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

// ─── Artist Universe Map ──────────────────────────────────────────────────────

export function renderUniverse(graphJson: string, nodeCount: number, edgeCount: number): string {
  const body = `
    <h1 class="page-title"><span class="icon">🌌</span> Artist Universe Map</h1>
    <p style="color:#64748b;font-size:.875rem;margin-bottom:.75rem">
      ${fmtNum(nodeCount)} artists &nbsp;·&nbsp; ${fmtNum(edgeCount)} connections
      &nbsp;·&nbsp; Node size = play count &nbsp;·&nbsp; Color = cluster &nbsp;·&nbsp; Hover for details
    </p>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.75rem;font-size:.8rem;align-items:center">
      <span style="color:#64748b">Highlight:</span>
      <button id="btn-core" class="btn btn-outline btn-sm">★ Core Identity</button>
      <button id="btn-sidequests" class="btn btn-outline btn-sm">🌙 Side Quests</button>
      <button id="btn-forgotten" class="btn btn-outline btn-sm">⚠ Forgotten</button>
      <button id="btn-bridges" class="btn btn-outline btn-sm">🌉 Bridges</button>
      <button id="btn-reset" class="btn btn-sm" style="background:#2a2d3e;color:#94a3b8">Reset</button>
      <label style="color:#64748b;margin-left:.5rem">Zoom: <input type="range" id="zoom-slider" min="0.2" max="4" step="0.1" value="1" style="width:80px;vertical-align:middle"></label>
    </div>
    <div id="universe-wrap">
      <svg id="universe-canvas" height="620"></svg>
      <div id="universe-tooltip"></div>
    </div>
    <div class="universe-legend" id="universe-legend"></div>
    <p style="color:#475569;font-size:.75rem;margin-top:.6rem">
      ★ white ring = core identity artists &nbsp;·&nbsp;
      🌉 gold ring = bridge artists (genre overlaps) &nbsp;·&nbsp;
      faded = forgotten artists (not played in 6+ months) &nbsp;·&nbsp;
      drag nodes · scroll to zoom
    </p>
    <div id="cluster-summary" style="margin-top:.75rem;display:flex;flex-wrap:wrap;gap:.5rem"></div>

    <script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js" integrity="sha384-CjloA8y00+1SDAUkjs099PVfnY2KmDC2BZnws9kh8D/lX1s46w6EPhpXdqMfjK6i" crossorigin="anonymous"></script>
    <script>
    (function() {
      const COLORS = ['#7c9ef8','#f87c9e','#9ef87c','#f8c97c','#c47cf8','#7cf8e6','#f87c7c','#f8f07c','#f89e7c','#7ca8f8'];
      const BRIDGE_COLOR = '#f8c97c'; // gold — bridge artists that connect clusters
      let zoomBehavior, svgSel, currentTransform = d3.zoomIdentity;

      function init() {
        const graphData = ${graphJson};
        const nodes = graphData.nodes || [];
        const edges = graphData.edges || [];
        if (!nodes.length) {
          document.getElementById('universe-canvas').innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#475569" dy=".3em">No data yet — import your scrobble history first.</text>';
          return;
        }

        const wrap   = document.getElementById('universe-wrap');
        const width  = wrap.clientWidth || 900;
        const height = 620;
        const maxPlays = d3.max(nodes, d => d.play_count) || 1;
        const r = d => 4 + Math.sqrt(d.play_count / maxPlays) * 22;

        svgSel = d3.select('#universe-canvas')
          .attr('width', width).attr('height', height)
          .attr('viewBox', [0, 0, width, height]);

        const g = svgSel.append('g');

        zoomBehavior = d3.zoom()
          .scaleExtent([0.1, 12])
          .on('zoom', e => { currentTransform = e.transform; g.attr('transform', e.transform); });
        svgSel.call(zoomBehavior);

        const sim = d3.forceSimulation(nodes)
          .force('link', d3.forceLink(edges).id(d => d.id).strength(e => Math.min(e.weight / 25, 0.4)).distance(80))
          .force('charge', d3.forceManyBody().strength(-180))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(d => r(d) + 4));

        const linkG = g.append('g').attr('class','links');
        const nodeG = g.append('g').attr('class','nodes');

        // Bridge edges: colour cross-cluster edges differently
        const link = linkG.selectAll('line').data(edges).join('line')
          .attr('stroke', e => {
            // Detect if source/target are in different clusters (bridge edge)
            const sn = nodes.find(n => n.id === (e.source.id || e.source));
            const tn = nodes.find(n => n.id === (e.target.id || e.target));
            return (sn && tn && sn.cluster !== tn.cluster) ? BRIDGE_COLOR + '33' : '#2a2d3e';
          })
          .attr('stroke-opacity', e => Math.min(0.9, 0.2 + e.weight/20))
          .attr('stroke-width', e => Math.max(0.5, Math.sqrt(e.weight)));

        const node = nodeG.selectAll('g').data(nodes).join('g').style('cursor','pointer')
          .call(d3.drag()
            .on('start', (e,d) => { if(!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
            .on('drag',  (e,d) => { d.fx=e.x; d.fy=e.y; })
            .on('end',   (e,d) => { if(!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }));

        // Outer glow ring for bridge artists (gold)
        node.filter(d => d.is_bridge).append('circle')
          .attr('r', d => r(d) + 5)
          .attr('fill', 'none')
          .attr('stroke', BRIDGE_COLOR)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3')
          .attr('opacity', 0.6)
          .attr('class', 'bridge-ring');

        node.append('circle')
          .attr('r', r)
          .attr('fill', d => COLORS[d.cluster % COLORS.length] ?? '#7c9ef8')
          .attr('opacity', d => d.is_forgotten ? 0.3 : 0.9)
          .attr('stroke', d => d.is_core ? '#fff' : 'none')
          .attr('stroke-width', d => d.is_core ? 2 : 0);

        // Label for large nodes only
        node.filter(d => d.play_count >= maxPlays * 0.1).append('text')
          .text(d => d.name.length > 14 ? d.name.slice(0,13)+'…' : d.name)
          .attr('text-anchor','middle').attr('dy','0.35em')
          .attr('font-size', d => Math.max(8, Math.min(12, r(d) * 0.65)))
          .attr('fill','#e2e8f0').attr('pointer-events','none')
          .style('text-shadow','0 0 4px #0f1117');

        // Tooltip
        const tip = document.getElementById('universe-tooltip');
        node.on('mouseover', (e, d) => {
          tip.style.display = 'block';
          const roleLabel = d.cluster_role === 'core'
            ? '<br><span style="color:#7c9ef8">★ Core identity cluster</span>'
            : '<br><span style="color:#c47cf8">🌙 Side quest cluster</span>';
          tip.innerHTML = '<strong style="color:#e2e8f0">' + d.name + '</strong><br>'
            + d.play_count.toLocaleString() + ' plays<br>'
            + 'First heard: ' + (d.first_heard ? d.first_heard.slice(0,10) : '?') + '<br>'
            + 'Last played: ' + (d.last_played ? d.last_played.slice(0,10) : '?')
            + roleLabel
            + (d.is_forgotten ? '<br><span style="color:#fb923c">⚠ Forgotten artist — you used to love them</span>' : '')
            + (d.is_bridge    ? '<br><span style="color:' + BRIDGE_COLOR + '">🌉 Bridge artist — connects your genres</span>' : '');
          moveTip(e);
        }).on('mousemove', moveTip).on('mouseout', () => { tip.style.display = 'none'; });

        function moveTip(e) {
          tip.style.left = (e.clientX + 14) + 'px';
          tip.style.top  = (e.clientY - 10) + 'px';
        }

        sim.on('tick', () => {
          link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y)
              .attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
          node.attr('transform',d=>'translate('+d.x+','+d.y+')');
        });

        // ── Cluster summary panel ──────────────────────────────────────────────
        const clusterInfo = {};
        nodes.forEach(n => {
          if (!clusterInfo[n.cluster]) clusterInfo[n.cluster] = { name: n.name, role: n.cluster_role, topName: n.name, plays: 0, count: 0 };
          clusterInfo[n.cluster].plays += n.play_count;
          clusterInfo[n.cluster].count++;
        });
        const summary = document.getElementById('cluster-summary');
        Object.entries(clusterInfo).slice(0,8).forEach(([ci, info]) => {
          const c    = COLORS[+ci % COLORS.length];
          const icon = info.role === 'core' ? '★' : '🌙';
          const tag  = info.role === 'core' ? 'Core Identity' : 'Side Quest';
          summary.innerHTML += '<span style="background:' + c + '22;color:' + c + ';border:1px solid ' + c + '44;padding:.3rem .75rem;border-radius:999px;font-size:.75rem;font-weight:600">'
            + icon + ' ' + tag + ': ' + info.topName + ' cluster (' + info.count + ' artists)</span>';
        });

        // Legend: unique clusters
        const clusterNames = {};
        nodes.forEach(n => { if(!clusterNames[n.cluster]) clusterNames[n.cluster] = n.name; });
        const leg = document.getElementById('universe-legend');
        Object.entries(clusterNames).slice(0,8).forEach(([ci, name]) => {
          const c = COLORS[+ci % COLORS.length];
          leg.innerHTML += '<span><i style="background:'+c+'"></i>' + name + ' cluster</span>';
        });

        // Controls
        document.getElementById('btn-core').onclick = () => {
          node.selectAll('circle:not(.bridge-ring)').attr('opacity', d => d.cluster_role === 'core' ? 0.95 : 0.12);
        };
        document.getElementById('btn-sidequests').onclick = () => {
          node.selectAll('circle:not(.bridge-ring)').attr('opacity', d => d.cluster_role === 'side_quest' ? 0.95 : 0.12);
        };
        document.getElementById('btn-forgotten').onclick = () => {
          node.selectAll('circle:not(.bridge-ring)').attr('opacity', d => d.is_forgotten ? 0.95 : 0.12);
        };
        document.getElementById('btn-bridges').onclick = () => {
          node.selectAll('circle:not(.bridge-ring)').attr('opacity', d => d.is_bridge ? 0.95 : 0.12);
          link.attr('stroke-opacity', e => {
            const sn = nodes.find(n => n.id === (e.source.id || e.source));
            const tn = nodes.find(n => n.id === (e.target.id || e.target));
            return (sn && tn && sn.cluster !== tn.cluster) ? 0.9 : 0.05;
          });
        };
        document.getElementById('btn-reset').onclick = () => {
          node.selectAll('circle:not(.bridge-ring)').attr('opacity', d => d.is_forgotten ? 0.3 : 0.9);
          link.attr('stroke-opacity', e => Math.min(0.9, 0.2 + e.weight/20));
        };
        document.getElementById('zoom-slider').oninput = function() {
          const t = d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(+this.value);
          svgSel.call(zoomBehavior.transform, t);
        };
      }
      init();
    })();
    </script>
  `;
  return layout({ title: "Artist Universe Map", active: "/universe", body });
}

// ─── Timeline heatmap ─────────────────────────────────────────────────────────

export function renderTimeline(heatmapJson: string): string {
  const body = `
    <h1 class="page-title"><span class="icon">📅</span> Listening Timeline</h1>
    <p style="color:#64748b;font-size:.875rem;margin-bottom:1.25rem">Your listening activity over the past 2 years — darker = more plays that day.</p>
    <div id="heatmap-container"></div>
    <div style="display:flex;align-items:center;gap:.5rem;margin-top:1rem;font-size:.75rem;color:#475569">
      <span>Less</span>
      <span style="display:flex;gap:2px">
        <span style="width:12px;height:12px;border-radius:2px;background:#1a1d27;display:inline-block"></span>
        <span style="width:12px;height:12px;border-radius:2px;background:#1e3a5f;display:inline-block"></span>
        <span style="width:12px;height:12px;border-radius:2px;background:#1d4ed8;display:inline-block"></span>
        <span style="width:12px;height:12px;border-radius:2px;background:#7c9ef8;display:inline-block"></span>
        <span style="width:12px;height:12px;border-radius:2px;background:#a5bbff;display:inline-block"></span>
      </span>
      <span>More</span>
    </div>
    <script>
    (function() {
      const days = ${heatmapJson};
      const el   = document.getElementById('heatmap-container');

      const map = {};
      let maxCount = 0;
      days.forEach(d => { map[d.date] = d.count; if(d.count > maxCount) maxCount = d.count; });

      function color(n) {
        if (!n) return '#1a1d27';
        const ratio = Math.log(n + 1) / Math.log(maxCount + 1);
        if (ratio < 0.2) return '#1e3a5f';
        if (ratio < 0.4) return '#1d4ed8';
        if (ratio < 0.65) return '#2563eb';
        if (ratio < 0.85) return '#7c9ef8';
        return '#a5bbff';
      }

      // Build weeks array: start from 2 years ago (Sunday-aligned)
      const end   = new Date();
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 2);
      start.setDate(start.getDate() - start.getDay()); // align to Sunday

      const weeks = [];
      const cur = new Date(start);
      while (cur <= end) {
        const week = [];
        for (let d = 0; d < 7; d++) {
          week.push(new Date(cur));
          cur.setDate(cur.getDate() + 1);
        }
        weeks.push(week);
      }

      const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

      // Group weeks by year for display
      const years = {};
      weeks.forEach((wk, wi) => {
        const yr = wk[0].getFullYear();
        if (!years[yr]) years[yr] = { startWi: wi, weeks: [] };
        years[yr].weeks.push({ wi, wk });
      });

      let html = '';
      Object.entries(years).forEach(([yr, yd]) => {
        const ywks = yd.weeks;
        html += '<div style="margin-bottom:1.5rem"><div class="heatmap-year-label">' + yr + '</div>';

        // Month labels
        html += '<div style="display:flex;margin-bottom:2px;">';
        html += '<div style="width:24px;flex-shrink:0"></div>'; // day label space
        let lastM = -1;
        ywks.forEach(({wk}) => {
          const m = wk[0].getMonth();
          if (m !== lastM) { html += '<span style="font-size:.65rem;color:#475569;width:14px;white-space:nowrap">' + MONTH_NAMES[m] + '</span>'; lastM = m; }
          else html += '<span style="width:14px"></span>';
        });
        html += '</div>';

        // Grid
        html += '<div style="display:flex;gap:0">';
        html += '<div style="display:flex;flex-direction:column;gap:2px;margin-right:2px;">';
        [0,1,2,3,4,5,6].forEach(d => {
          html += '<div style="height:12px;width:22px;font-size:.6rem;color:#475569;line-height:12px;text-align:right;padding-right:2px">' + (d%2===1?DAY_NAMES[d]:'') + '</div>';
        });
        html += '</div>';

        // Week columns
        ywks.forEach(({wk}) => {
          html += '<div style="display:flex;flex-direction:column;gap:2px;margin-right:2px">';
          wk.forEach(day => {
            const ds = day.toISOString().slice(0,10);
            const cnt = map[ds] || 0;
            html += '<div class="heatmap-cell" style="background:' + color(cnt) + '" title="' + ds + ': ' + cnt + ' plays"></div>';
          });
          html += '</div>';
        });
        html += '</div></div>';
      });

      el.innerHTML = '<div class="heatmap-outer">' + html + '</div>';
    })();
    </script>
  `;
  return layout({ title: "Listening Timeline", active: "/timeline", body });
}

// ─── Taste DNA ────────────────────────────────────────────────────────────────

export function renderTaste(drift: {
  era_label: string;
  snapshot_label: string;
  current_top: { name: string; plays: number }[];
  year_ago_top: { name: string; plays: number }[];
  new_artists: string[];
  drifted_away: string[];
  consistency_score: number;
  drift_magnitude: number;
  drift_direction: "anchored" | "exploring" | "pivoting";
}): string {
  const maxCur  = drift.current_top[0]?.plays  || 1;
  const maxPast = drift.year_ago_top[0]?.plays || 1;

  const barRow = (name: string, plays: number, max: number) => `
    <div class="taste-bar-wrap">
      <div class="taste-bar-label"><span>${escHtml(name)}</span><span>${plays.toLocaleString()}</span></div>
      <div class="taste-bar-track"><div class="taste-bar-fill" style="width:${Math.round((plays/max)*100)}%"></div></div>
    </div>`;

  const scoreColor =
    drift.consistency_score > 70 ? "#4ade80" :
    drift.consistency_score > 40 ? "#f8c97c" : "#f87c7c";

  const driftColor =
    drift.drift_magnitude < 30 ? "#4ade80" :
    drift.drift_magnitude < 65 ? "#f8c97c" : "#f87c7c";

  const directionIcon =
    drift.drift_direction === "anchored"  ? "⚓" :
    drift.drift_direction === "exploring" ? "🧭" : "🔀";
  const directionLabel =
    drift.drift_direction === "anchored"  ? "Anchored — same artists as last year" :
    drift.drift_direction === "exploring" ? "Exploring — mixing old faves with new sounds" :
                                            "Pivoting — completely different taste this month";

  const newChips   = drift.new_artists.slice(0, 8).map(a => `<span class="drift-chip drift-new">+ ${escHtml(a)}</span>`).join("");
  const awayChips  = drift.drifted_away.slice(0, 8).map(a => `<span class="drift-chip drift-away">− ${escHtml(a)}</span>`).join("");

  const noDataMsg = `<div class="empty" style="padding:2rem"><div class="icon">🎵</div><p>Not enough data yet — import more scrobbles to see your taste evolution.</p></div>`;
  const hasData   = drift.current_top.length > 0;

  const body = `
    <h1 class="page-title"><span class="icon">🧬</span> Taste DNA</h1>

    ${!hasData ? noDataMsg : `

    <div class="era-card" style="margin-bottom:1rem">
      <div style="font-size:.7rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem">📸 Identity Snapshot</div>
      <div class="era-label" style="font-size:1.3rem">${escHtml(drift.snapshot_label)}</div>
      <div style="margin-top:.5rem;font-size:.85rem;color:#7c9ef8;font-style:italic">${escHtml(drift.era_label)}</div>
    </div>

    <div style="background:#1a1d27;border:1px solid #2a2d3e;border-radius:.5rem;padding:1rem;margin-bottom:1.25rem">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
        <div class="consistency-ring">
          <div>
            <div class="score" style="color:${scoreColor}">${drift.consistency_score}%</div>
            <div style="font-size:.7rem">taste consistency</div>
          </div>
          <div style="font-size:.8rem;color:#64748b;max-width:160px">
            ${drift.consistency_score > 70 ? "You've been loyal to your artists 💙" :
              drift.consistency_score > 40 ? "A healthy mix of old faves & new sounds" :
              "Your taste has shifted a lot this month 🔄"}
          </div>
        </div>

        <div style="flex:1;min-width:200px">
          <div style="font-size:.75rem;color:#64748b;margin-bottom:.4rem;display:flex;justify-content:space-between">
            <span>Taste Drift Meter</span>
            <span style="color:${driftColor}">${drift.drift_magnitude}% drifted</span>
          </div>
          <div style="background:#0f1117;border-radius:999px;height:10px;overflow:hidden;border:1px solid #2a2d3e">
            <div style="height:10px;border-radius:999px;background:linear-gradient(90deg,#4ade80,#f8c97c,#f87c7c);width:${drift.drift_magnitude}%;transition:width .6s"></div>
          </div>
          <div style="margin-top:.4rem;font-size:.8rem;color:#94a3b8">${directionIcon} ${escHtml(directionLabel)}</div>
        </div>
      </div>
    </div>

    <div class="taste-compare">
      <div>
        <h3>This Month</h3>
        ${drift.current_top.map(a => barRow(a.name, a.plays, maxCur)).join("") || "<p style='color:#475569;font-size:.85rem'>No plays this month.</p>"}
      </div>
      <div>
        <h3>A Year Ago (same period)</h3>
        ${drift.year_ago_top.map(a => barRow(a.name, a.plays, maxPast)).join("") || "<p style='color:#475569;font-size:.85rem'>No data for this period.</p>"}
      </div>
    </div>

    ${newChips ? `
    <div style="margin-bottom:1.25rem">
      <p style="font-size:.8rem;color:#4ade80;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">✨ New discoveries this month</p>
      ${newChips}
    </div>` : ""}

    ${awayChips ? `
    <div style="margin-bottom:1.25rem">
      <p style="font-size:.8rem;color:#fb923c;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">👋 Artists you've drifted from (vs. a year ago)</p>
      ${awayChips}
    </div>` : ""}

    <div style="background:#1a1d27;border:1px solid #2a2d3e;border-radius:.5rem;padding:1rem;margin-top:.5rem">
      <p style="font-size:.8rem;color:#64748b">
        💡 <strong style="color:#94a3b8">How this works:</strong> Taste DNA compares your top 10 artists over the last 30 days vs. the same 30-day window one year ago.
        Drift meter = % of your current top-10 that wasn't in your top-10 a year ago.
        <a href="/universe" style="color:#7c9ef8">Explore the Universe Map</a> to see how your artists cluster and connect.
      </p>
    </div>
    `}
  `;
  return layout({ title: "Taste DNA", active: "/taste", body });
}

// ─── Yearly Wrapped ───────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

function wrappedMonthChart(monthly_counts: number[]): string {
  const max = Math.max(...monthly_counts, 1);
  const W = 360, H = 80, BAR_W = 24, GAP = 6;
  const bars = monthly_counts.map((n, i) => {
    const barH = Math.max(2, Math.round((n / max) * (H - 20)));
    const x    = i * (BAR_W + GAP);
    const y    = H - 20 - barH;
    return `<rect class="wrapped-chart-bar" x="${x}" y="${y}" width="${BAR_W}" height="${barH}" rx="3">
      <title>${MONTH_NAMES[i]}: ${n.toLocaleString()} plays</title></rect>
      <text x="${x + BAR_W / 2}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#475569">${MONTH_NAMES[i]}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${(BAR_W + GAP) * 12 - GAP} ${H}" style="width:100%;max-width:${W}px;display:block">${bars}</svg>`;
}

function rankNum(i: number): string {
  const cls = i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "";
  return `<span class="wrapped-rank-num${cls ? " " + cls : ""}">${i + 1}</span>`;
}

export function renderWrapped(
  data: WrappedYear | null,
  year: number,
  availableYears: number[],
): string {
  const yearNav = availableYears.map(y =>
    y === year
      ? `<span class="current-year">${y}</span>`
      : `<a href="/wrapped?year=${y}">${y}</a>`,
  ).join("");

  if (!data || year === 0) {
    const body = `
      <h1 class="page-title"><span class="icon">🎁</span> Wrapped</h1>
      ${yearNav ? `<div class="wrapped-year-nav">${yearNav}</div>` : ""}
      <div class="empty" style="padding:3rem">
        <div class="icon">🎵</div>
        <p>${availableYears.length > 0
          ? `No scrobble data for ${year}. <a href="/wrapped?year=${availableYears[0]}">See ${availableYears[0]}</a>`
          : `No scrobble history yet. <a href="/ingest">Import your history to get started.</a>`
        }</p>
      </div>`;
    const titleYear = year > 0 ? `${year} ` : "";
    return layout({ title: `${titleYear}Wrapped`, active: "/wrapped", body });
  }

  const maxArtist = data.top_artists[0]?.play_count || 1;
  const maxTrack  = data.top_tracks[0]?.play_count  || 1;
  const maxAlbum  = data.top_albums[0]?.play_count  || 1;

  const artistRows = data.top_artists.map((a, i) => `
    <div class="wrapped-rank-item">
      ${rankNum(i)}
      <div class="wrapped-rank-bar-wrap">
        <div class="wrapped-rank-name"><a href="/artists/${encodeURIComponent(a.artist_id)}" style="color:inherit">${escHtml(a.artist_name)}</a></div>
        <div class="wrapped-rank-bar" style="width:${Math.round((a.play_count / maxArtist) * 100)}%"></div>
      </div>
      <span class="wrapped-rank-count">${fmtNum(a.play_count)}</span>
    </div>`).join("");

  const trackRows = data.top_tracks.map((t, i) => `
    <div class="wrapped-rank-item">
      ${rankNum(i)}
      <div class="wrapped-rank-bar-wrap">
        <div class="wrapped-rank-name"><a href="/tracks/${encodeURIComponent(t.track_id)}" style="color:inherit">${escHtml(t.track_title)}</a></div>
        <div class="wrapped-rank-sub">${escHtml(t.artist_name)}</div>
        <div class="wrapped-rank-bar" style="width:${Math.round((t.play_count / maxTrack) * 100)}%"></div>
      </div>
      <span class="wrapped-rank-count">${fmtNum(t.play_count)}</span>
    </div>`).join("");

  const albumRows = data.top_albums.map((a, i) => `
    <div class="wrapped-rank-item">
      ${rankNum(i)}
      <div class="wrapped-rank-bar-wrap">
        <div class="wrapped-rank-name"><a href="/albums/${encodeURIComponent(a.album_id)}" style="color:inherit">${escHtml(a.album_title)}</a></div>
        <div class="wrapped-rank-sub">${escHtml(a.artist_name)}</div>
        <div class="wrapped-rank-bar" style="width:${Math.round((a.play_count / maxAlbum) * 100)}%"></div>
      </div>
      <span class="wrapped-rank-count">${fmtNum(a.play_count)}</span>
    </div>`).join("");

  // Peak day label — peak_day_date is already YYYY-MM-DD from strftime, safe to parse directly
  const peakDayLabel = data.peak_day_date
    ? fmtDate(data.peak_day_date)
    : "—";

  // Most active month name — clamp to valid range 1-12
  const safeMonth    = Math.min(12, Math.max(1, data.most_active_month));
  const activeMonthName = MONTH_NAMES[safeMonth - 1] ?? "—";

  // Listening days %
  const daysInYear = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
  const activePct  = Math.round((data.active_days / daysInYear) * 100);

  // Avg daily plays
  const avgDaily = data.active_days > 0
    ? Math.round(data.total_scrobbles / data.active_days)
    : 0;

  // Estimated listening time (hours)
  const estHours = Math.round(data.estimated_minutes / 60);

  // Year-over-year label
  const yoyLabel = data.yoy_change_pct === null
    ? null
    : data.yoy_change_pct >= 0
      ? `+${data.yoy_change_pct}% vs ${year - 1}`
      : `${data.yoy_change_pct}% vs ${year - 1}`;
  const yoyColor = data.yoy_change_pct === null
    ? "#64748b"
    : data.yoy_change_pct >= 0 ? "#4ade80" : "#f87c7c";

  // First/last scrobble nicely formatted
  const firstDate = data.first_scrobble ? fmtDate(data.first_scrobble) : "—";
  const lastDate  = data.last_scrobble  ? fmtDate(data.last_scrobble)  : "—";

  const body = `
    <h1 class="page-title"><span class="icon">🎁</span> Wrapped</h1>

    <div class="wrapped-year-nav">${yearNav}</div>

    <div class="wrapped-hero">
      <div style="font-size:.8rem;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">Your ${year} in Music</div>
      <div style="display:flex;align-items:baseline;gap:1rem;flex-wrap:wrap">
        <div>
          <div class="wrapped-big-num">${fmtNum(data.total_scrobbles)}</div>
          <div class="wrapped-big-label">scrobbles</div>
        </div>
        ${yoyLabel ? `<div style="font-size:1.1rem;font-weight:700;color:${yoyColor};align-self:flex-end;padding-bottom:.15rem">${escHtml(yoyLabel)}</div>` : ""}
      </div>
      <div class="wrapped-hero-grid">
        <div><div style="font-size:1.6rem;font-weight:700;color:#7c9ef8">${fmtNum(data.unique_artists)}</div><div style="font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Artists</div></div>
        <div><div style="font-size:1.6rem;font-weight:700;color:#f87c9e">${fmtNum(data.unique_albums)}</div><div style="font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Albums</div></div>
        <div><div style="font-size:1.6rem;font-weight:700;color:#9ef87c">${fmtNum(data.unique_tracks)}</div><div style="font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Tracks</div></div>
        <div><div style="font-size:1.6rem;font-weight:700;color:#f8c97c">${fmtNum(data.active_days)}</div><div style="font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Listening Days</div></div>
        <div><div style="font-size:1.6rem;font-weight:700;color:#c47cf8">${fmtNum(data.new_artists_count)}</div><div style="font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em">New Discoveries</div></div>
        <div><div style="font-size:1.6rem;font-weight:700;color:#7cf8e6">${fmtNum(estHours)}</div><div style="font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Hours Listened</div></div>
      </div>
    </div>

    <div class="wrapped-milestones">
      <div class="wrapped-milestone">
        <div class="wrapped-milestone-icon">🔥</div>
        <div class="wrapped-milestone-text">
          Peak day: <strong>${peakDayLabel}</strong><br>
          <strong>${fmtNum(data.peak_day_count)}</strong> plays in one day
        </div>
      </div>
      <div class="wrapped-milestone">
        <div class="wrapped-milestone-icon">📅</div>
        <div class="wrapped-milestone-text">
          Most active month: <strong>${activeMonthName}</strong><br>
          <strong>${fmtNum(data.most_active_month_count)}</strong> plays
        </div>
      </div>
      <div class="wrapped-milestone">
        <div class="wrapped-milestone-icon">📊</div>
        <div class="wrapped-milestone-text">
          You listened on <strong>${activePct}%</strong> of all days<br>
          avg <strong>${fmtNum(avgDaily)}</strong> plays on active days
        </div>
      </div>
      <div class="wrapped-milestone">
        <div class="wrapped-milestone-icon">⚡</div>
        <div class="wrapped-milestone-text">
          Best streak in ${year}: <strong>${data.top_streak}</strong> day${data.top_streak === 1 ? "" : "s"} in a row<br>
          <span style="color:#475569">Longest listening run of the year</span>
        </div>
      </div>
      <div class="wrapped-milestone">
        <div class="wrapped-milestone-icon">🎧</div>
        <div class="wrapped-milestone-text">
          ~<strong>${fmtNum(estHours)} hours</strong> of music<br>
          <span style="color:#475569">≈ ${Math.round(estHours / 24)} full days of listening</span>
        </div>
      </div>
      <div class="wrapped-milestone">
        <div class="wrapped-milestone-icon">✨</div>
        <div class="wrapped-milestone-text">
          Discovered <strong>${fmtNum(data.new_artists_count)}</strong> artists for the first time<br>
          <span style="color:#475569">${firstDate} → ${lastDate}</span>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.25rem;margin-bottom:1.25rem">
      <div class="wrapped-section">
        <div class="wrapped-section-title">🎤 Top Artists</div>
        <div class="wrapped-rank-list">
          ${artistRows || `<p style="color:#475569;font-size:.85rem">No artist data.</p>`}
        </div>
      </div>
      <div class="wrapped-section">
        <div class="wrapped-section-title">🎼 Top Tracks</div>
        <div class="wrapped-rank-list">
          ${trackRows || `<p style="color:#475569;font-size:.85rem">No track data.</p>`}
        </div>
      </div>
      <div class="wrapped-section">
        <div class="wrapped-section-title">💿 Top Albums</div>
        <div class="wrapped-rank-list">
          ${albumRows || `<p style="color:#475569;font-size:.85rem">No album data.</p>`}
        </div>
      </div>
    </div>

    <div class="wrapped-section">
      <div class="wrapped-section-title">📈 Monthly Breakdown</div>
      ${wrappedMonthChart(data.monthly_counts)}
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem">
        ${data.monthly_counts.map((n, i) => `<span style="font-size:.75rem;color:${n === data.most_active_month_count ? "#7c9ef8" : "#475569"};font-weight:${n === data.most_active_month_count ? "700" : "400"}">${MONTH_NAMES[i]}: ${n.toLocaleString()}</span>`).join(" · ")}
      </div>
    </div>

    <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem">
      <a href="/timeline" class="btn btn-outline">📅 Full Timeline</a>
      <a href="/taste" class="btn btn-outline">🧬 Taste DNA</a>
      <a href="/universe" class="btn btn-outline">🌌 Artist Universe</a>
      ${availableYears.filter(y => y !== year).slice(0, 3).map(y =>
        `<a href="/wrapped?year=${y}" class="btn btn-outline">🎁 ${y} Wrapped</a>`
      ).join("")}
    </div>
  `;
  return layout({ title: `${year} Wrapped`, active: "/wrapped", body });
}
