'use strict';
const https = require('https');

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
const LIBREFM_API_URL = 'https://libre.fm/2.0/';

function apiGet(network, params) {
  return new Promise((resolve, reject) => {
    const baseUrl = network === 'librefm' ? LIBREFM_API_URL : LASTFM_API_URL;
    const qs = new URLSearchParams({ ...params, format: 'json' }).toString();
    const url = `${baseUrl}?${qs}`;
    https.get(url, { headers: { 'User-Agent': 'scrobbledb-nodejs/1.2.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse response: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function getRecentTracksPage(network, apiKey, username, { page = 1, limit = 200, from = null, to = null } = {}) {
  const params = {
    method: 'user.getRecentTracks',
    api_key: apiKey,
    user: username,
    page,
    limit,
  };
  if (from) params.from = from;
  if (to) params.to = to;
  const data = await apiGet(network, params);
  if (data.error) throw new Error(`Last.fm API error ${data.error}: ${data.message}`);
  return data.recenttracks;
}

async function getRecentTracksCount(network, apiKey, username, { from = null, to = null } = {}) {
  const page = await getRecentTracksPage(network, apiKey, username, { page: 1, limit: 1, from, to });
  return parseInt(page['@attr']?.total || '0', 10);
}

// Parse a track object from the Last.fm API response
function parseTrack(track) {
  if (track['@attr']?.nowplaying === 'true') return null; // skip now-playing
  const timestamp = track.date?.uts ? parseInt(track.date.uts, 10) : null;
  if (!timestamp) return null; // skip tracks without a timestamp
  return {
    artist: {
      id: track.artist?.mbid || `artist:${track.artist?.['#text'] || ''}`,
      name: track.artist?.['#text'] || '',
    },
    album: {
      id: track.album?.mbid || `album:${track.album?.['#text'] || ''}:${track.artist?.['#text'] || ''}`,
      title: track.album?.['#text'] || '',
    },
    track: {
      id: track.mbid || `track:${track.name || ''}:${track.album?.['#text'] || ''}:${track.artist?.['#text'] || ''}`,
      title: track.name || '',
    },
    timestamp,
  };
}

module.exports = { apiGet, getRecentTracksPage, getRecentTracksCount, parseTrack };
