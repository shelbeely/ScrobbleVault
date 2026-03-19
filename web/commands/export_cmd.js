'use strict';
const path = require('path');
const fs = require('fs');
const { getDefaultDbPath } = require('../lib/paths');
const { openDb } = require('../lib/database');

const PRESET_QUERIES = {
  plays: `
    SELECT plays.timestamp, tracks.title as track_title, albums.title as album_title,
           artists.name as artist_name, tracks.id as track_id, albums.id as album_id, artists.id as artist_id
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id
    ORDER BY plays.timestamp DESC
  `,
  tracks: `
    SELECT tracks.id, tracks.title, albums.title as album_title, artists.name as artist_name,
           albums.id as album_id, artists.id as artist_id
    FROM tracks
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id
    ORDER BY artists.name, albums.title, tracks.title
  `,
  albums: `
    SELECT albums.id, albums.title, artists.name as artist_name, artists.id as artist_id,
           COUNT(DISTINCT tracks.id) as track_count
    FROM albums
    JOIN artists ON albums.artist_id = artists.id
    LEFT JOIN tracks ON albums.id = tracks.album_id
    GROUP BY albums.id
    ORDER BY artists.name, albums.title
  `,
  artists: `
    SELECT artists.id, artists.name,
           COUNT(DISTINCT albums.id) as album_count,
           COUNT(DISTINCT tracks.id) as track_count,
           COUNT(plays.timestamp) as play_count
    FROM artists
    LEFT JOIN albums ON artists.id = albums.artist_id
    LEFT JOIN tracks ON albums.id = tracks.album_id
    LEFT JOIN plays ON tracks.id = plays.track_id
    GROUP BY artists.id
    ORDER BY artists.name
  `,
};

function run({ database, preset = 'plays', sql: customSql, format = 'json', output, limit } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  const db = openDb(dbPath, { readonly: true });

  let query = customSql || PRESET_QUERIES[preset];
  if (!query) {
    console.error(`Unknown preset: ${preset}. Valid: ${Object.keys(PRESET_QUERIES).join(', ')}`);
    process.exit(1);
  }

  const params = [];
  if (limit) {
    query = query.trimEnd().replace(/;?$/, '') + ' LIMIT ?';
    params.push(parseInt(limit, 10));
  }

  const rows = db.prepare(query).all(...params);
  db.close();

  let content;
  if (format === 'json') {
    content = JSON.stringify(rows, null, 2);
  } else if (format === 'jsonl') {
    content = rows.map(r => JSON.stringify(r)).join('\n');
  } else if (format === 'csv' || format === 'tsv') {
    const sep = format === 'tsv' ? '\t' : ',';
    if (rows.length === 0) { content = ''; }
    else {
      const headers = Object.keys(rows[0]);
      const escape = (v) => format === 'csv' ? `"${String(v ?? '').replace(/"/g, '""')}"` : String(v ?? '');
      content = [headers.join(sep), ...rows.map(r => headers.map(h => escape(r[h])).join(sep))].join('\n');
    }
  } else {
    console.error(`Unknown format: ${format}`);
    process.exit(1);
  }

  if (output && output !== '-') {
    fs.writeFileSync(path.resolve(output), content, 'utf8');
    console.log(`✓ Exported ${rows.length} rows to ${output}`);
  } else {
    process.stdout.write(content + '\n');
  }
}

module.exports = { run };
