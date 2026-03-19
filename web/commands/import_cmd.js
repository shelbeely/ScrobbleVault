'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getDefaultDbPath, ensureDataDir } = require('../lib/paths');
const { openDb, setupSchema, batchUpsert, rebuildFts5 } = require('../lib/database');

async function run({ file, database, format, noIndex } = {}) {
  const dbPath = path.resolve(database || getDefaultDbPath());
  ensureDataDir();
  const db = openDb(dbPath);
  setupSchema(db);

  const stream = file === '-' ? process.stdin : fs.createReadStream(path.resolve(file));
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let count = 0;
  let lineNum = 0;
  const batch = [];

  for await (const line of rl) {
    lineNum++;
    if (!line.trim()) continue;

    let record;
    try {
      if (format === 'jsonl' || (format === 'auto' && line.startsWith('{'))) {
        record = JSON.parse(line);
      } else if (format === 'csv' || format === 'tsv' || format === 'auto') {
        const sep = format === 'tsv' ? '\t' : ',';
        const parts = line.split(sep);
        // Expected columns: timestamp, track_title, album_title, artist_name, track_id, album_id, artist_id
        if (lineNum === 1 && isNaN(parseInt(parts[0], 10))) continue; // skip header
        record = {
          timestamp: parseInt(parts[0], 10),
          track: { id: parts[4] || `track:${parts[1]}`, title: parts[1] },
          album: { id: parts[5] || `album:${parts[2]}`, title: parts[2] },
          artist: { id: parts[6] || `artist:${parts[3]}`, name: parts[3] },
        };
      }
    } catch (e) {
      console.warn(`Line ${lineNum}: parse error - ${e.message}`);
      continue;
    }

    if (!record) continue;

    // Normalize JSONL format (may have flat or nested structure)
    const scrobble = normalizeRecord(record);
    if (scrobble) batch.push(scrobble);

    if (batch.length >= 500) {
      batchUpsert(db, batch);
      count += batch.length;
      batch.length = 0;
      process.stdout.write(`\rImported ${count} records...`);
    }
  }

  if (batch.length > 0) {
    batchUpsert(db, batch);
    count += batch.length;
  }

  console.log(`\n✓ Imported ${count} scrobbles`);

  if (!noIndex && count > 0) {
    rebuildFts5(db);
    console.log('✓ Search index updated');
  }

  db.close();
}

function normalizeRecord(r) {
  try {
    // Handle both nested {artist:{id,name}, album:{id,title}, track:{id,title}, timestamp}
    // and flat {artist_name, album_title, track_title, timestamp, artist_id, album_id, track_id}
    if (r.artist && r.album && r.track) return r;
    const ts = parseInt(r.timestamp, 10);
    if (isNaN(ts)) return null;
    return {
      artist: { id: r.artist_id || `artist:${r.artist_name}`, name: r.artist_name || '' },
      album: { id: r.album_id || `album:${r.album_title}:${r.artist_name}`, title: r.album_title || '' },
      track: { id: r.track_id || `track:${r.track_title}:${r.album_title}`, title: r.track_title || '' },
      timestamp: ts,
    };
  } catch { return null; }
}

module.exports = { run };
