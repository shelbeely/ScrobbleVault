'use strict';
const path = require('path');
const Database = require('better-sqlite3');
const { loadAuth } = require('../lib/config');
const { getDefaultDbPath, ensureDataDir } = require('../lib/paths');
const { openDb, setupSchema, setupFts5, rebuildFts5, batchUpsert, getLatestTimestamp } = require('../lib/database');
const { getRecentTracksPage, getRecentTracksCount, parseTrack } = require('../lib/lastfm');

async function run({ database, auth: authPath, since, until, limit, noIndex } = {}) {
  const credentials = loadAuth(authPath);
  if (!credentials) {
    console.error("No auth credentials found. Run 'scrobbledb auth' first.");
    process.exit(1);
  }

  const dbPath = path.resolve(database || getDefaultDbPath());
  ensureDataDir();
  const db = openDb(dbPath);
  setupSchema(db);

  const { lastfm_network: network, lastfm_username: username, lastfm_api_key: apiKey } = credentials;

  // Determine start timestamp
  let fromTs = null;
  if (since) {
    fromTs = Math.floor(new Date(since).getTime() / 1000);
  } else {
    const latest = getLatestTimestamp(db);
    if (latest) {
      fromTs = latest + 1; // fetch only newer tracks
      console.log(`Resuming from ${new Date(fromTs * 1000).toISOString()}`);
    }
  }

  let toTs = null;
  if (until) toTs = Math.floor(new Date(until).getTime() / 1000);

  // Count total tracks
  console.log('Checking track count...');
  let total;
  try {
    total = await getRecentTracksCount(network, apiKey, username, { from: fromTs, to: toTs });
  } catch (e) {
    console.error(`Failed to get track count: ${e.message}`);
    total = null;
  }
  if (total !== null) console.log(`Found ${total} tracks to fetch`);

  // Fetch pages
  let page = 1;
  let fetched = 0;
  const pageLimit = 200;
  let done = false;

  while (!done) {
    let data;
    try {
      data = await getRecentTracksPage(network, apiKey, username, { page, limit: pageLimit, from: fromTs, to: toTs });
    } catch (e) {
      console.error(`Error fetching page ${page}: ${e.message}`);
      break;
    }

    const tracks = data.track || [];
    if (!Array.isArray(tracks) || tracks.length === 0) break;

    const scrobbles = tracks.map(parseTrack).filter(Boolean);
    if (scrobbles.length > 0) {
      batchUpsert(db, scrobbles);
      fetched += scrobbles.length;
    }

    const totalPages = parseInt(data['@attr']?.totalPages || '1', 10);
    process.stdout.write(`\rFetched ${fetched} tracks (page ${page}/${totalPages})...`);

    if (page >= totalPages) break;
    if (limit && fetched >= limit) break;
    page++;

    // Be polite to the API
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✓ Ingested ${fetched} scrobbles`);

  if (!noIndex) {
    console.log('Rebuilding FTS5 search index...');
    rebuildFts5(db);
    console.log('✓ Search index updated');
  }

  db.close();
}

module.exports = { run };
