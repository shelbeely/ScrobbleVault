#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const pkg = require('../package.json');

const program = new Command();

program
  .name('scrobbledb')
  .description('Save data from last.fm/libre.fm to a SQLite database')
  .version(pkg.version);

// ── Global database option ────────────────────────────────────────────────────
const dbOption = ['-d, --database <path>', 'Path to SQLite database'];

// ── auth ─────────────────────────────────────────────────────────────────────
program
  .command('auth')
  .description('Save authentication credentials to a JSON file')
  .option('-a, --auth <path>', 'Path to save credentials (default: XDG data dir)')
  .option('-n, --network <name>', 'Network to use: lastfm or librefm', 'lastfm')
  .action(async (opts) => {
    const { run } = require('../commands/auth');
    await run(opts);
  });

// ── config ────────────────────────────────────────────────────────────────────
const configCmd = program.command('config').description('Configuration and database management');

configCmd
  .command('init')
  .description('Initialize scrobbledb data directory and database')
  .option('--dry-run', 'Check state without making changes')
  .option('--no-index', 'Skip FTS5 search index initialization')
  .action((opts) => {
    const { initCmd } = require('../commands/config_cmd');
    initCmd({ noIndex: opts.noIndex, dryRun: opts.dryRun });
  });

configCmd
  .command('reset [database]')
  .description('Reset the scrobbledb database (DESTRUCTIVE)')
  .option('--no-index', 'Skip FTS5 initialization after reset')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (database, opts) => {
    const { resetCmd } = require('../commands/config_cmd');
    await resetCmd({ database, noIndex: opts.noIndex, force: opts.force });
  });

configCmd
  .command('location')
  .description('Show configuration and data directory locations')
  .action(() => {
    const { locationCmd } = require('../commands/config_cmd');
    locationCmd();
  });

// ── ingest ────────────────────────────────────────────────────────────────────
program
  .command('ingest')
  .description('Fetch listening history from Last.fm and store in database')
  .option(...dbOption)
  .option('-a, --auth <path>', 'Path to auth credentials file')
  .option('--since <date>', 'Fetch tracks since this date (ISO 8601)')
  .option('--until <date>', 'Fetch tracks until this date (ISO 8601)')
  .option('-l, --limit <n>', 'Maximum number of tracks to fetch', parseInt)
  .option('--no-index', 'Skip FTS5 index rebuild after ingest')
  .action(async (opts) => {
    const { run } = require('../commands/ingest');
    await run(opts);
  });

// ── import ────────────────────────────────────────────────────────────────────
program
  .command('import <file>')
  .description('Import scrobbles from a file (JSONL, CSV, TSV, or - for stdin)')
  .option(...dbOption)
  .option('--format <fmt>', 'File format: auto, jsonl, csv, tsv', 'auto')
  .option('--no-index', 'Skip FTS5 index rebuild after import')
  .action(async (file, opts) => {
    const { run } = require('../commands/import_cmd');
    await run({ file, ...opts });
  });

// ── index ─────────────────────────────────────────────────────────────────────
program
  .command('index')
  .description('Build or rebuild the FTS5 full-text search index')
  .option(...dbOption)
  .action((opts) => {
    const { run } = require('../commands/index_cmd');
    run(opts);
  });

// ── search ─────────────────────────────────────────────────────────────────────
program
  .command('search <query>')
  .description('Search tracks, artists, and albums using full-text search')
  .option(...dbOption)
  .option('-l, --limit <n>', 'Maximum results', (v) => parseInt(v, 10), 20)
  .option('--format <fmt>', 'Output format: table or json', 'table')
  .action((query, opts) => {
    const { run } = require('../commands/search_cmd');
    run(query, opts);
  });

// ── export ────────────────────────────────────────────────────────────────────
program
  .command('export')
  .description('Export scrobble data to a file or stdout')
  .option(...dbOption)
  .option('-p, --preset <name>', 'Data preset: plays, tracks, albums, artists', 'plays')
  .option('--sql <query>', 'Custom SQL query')
  .option('--format <fmt>', 'Output format: json, jsonl, csv, tsv', 'json')
  .option('-o, --output <path>', 'Output file path (default: stdout)')
  .option('-l, --limit <n>', 'Maximum rows to export', parseInt)
  .action((opts) => {
    const { run } = require('../commands/export_cmd');
    run(opts);
  });

// ── stats ─────────────────────────────────────────────────────────────────────
const statsCmd = program.command('stats').description('Descriptive statistics about your scrobbles');

statsCmd
  .command('overview')
  .description('Display overall scrobble statistics')
  .option(...dbOption)
  .option('--format <fmt>', 'Output format: table or json', 'table')
  .action((opts) => {
    const { overviewCmd } = require('../commands/stats_cmd');
    overviewCmd(opts);
  });

statsCmd
  .command('monthly')
  .description('Monthly scrobble rollup')
  .option(...dbOption)
  .option('--format <fmt>', 'Output format: table or json', 'table')
  .option('-l, --limit <n>', 'Number of months to show', parseInt)
  .option('--since <date>', 'Start date filter')
  .option('--until <date>', 'End date filter')
  .action((opts) => {
    const { monthlyCmd } = require('../commands/stats_cmd');
    monthlyCmd(opts);
  });

statsCmd
  .command('yearly')
  .description('Yearly scrobble rollup')
  .option(...dbOption)
  .option('--format <fmt>', 'Output format: table or json', 'table')
  .option('-l, --limit <n>', 'Number of years to show', parseInt)
  .option('--since <date>', 'Start date filter')
  .option('--until <date>', 'End date filter')
  .action((opts) => {
    const { yearlyCmd } = require('../commands/stats_cmd');
    yearlyCmd(opts);
  });

// ── artists ───────────────────────────────────────────────────────────────────
const artistsCmd = program.command('artists').description('Browse artist data');

artistsCmd
  .command('top')
  .description('Show top artists by play count')
  .option(...dbOption)
  .option('-l, --limit <n>', 'Number of artists', (v) => parseInt(v, 10), 20)
  .option('--format <fmt>', 'Output format: table or json', 'table')
  .action((opts) => {
    const { topCmd } = require('../commands/artists_cmd');
    topCmd(opts);
  });

// ── albums ────────────────────────────────────────────────────────────────────
const albumsCmd = program.command('albums').description('Browse album data');

albumsCmd
  .command('top')
  .description('Show top albums by play count')
  .option(...dbOption)
  .option('-l, --limit <n>', 'Number of albums', (v) => parseInt(v, 10), 20)
  .option('--format <fmt>', 'Output format: table or json', 'table')
  .action((opts) => {
    const { topCmd } = require('../commands/albums_cmd');
    topCmd(opts);
  });

// ── tracks ────────────────────────────────────────────────────────────────────
const tracksCmd = program.command('tracks').description('Browse track data');

tracksCmd
  .command('top')
  .description('Show top tracks by play count')
  .option(...dbOption)
  .option('-l, --limit <n>', 'Number of tracks', (v) => parseInt(v, 10), 20)
  .option('--format <fmt>', 'Output format: table or json', 'table')
  .action((opts) => {
    const { topCmd } = require('../commands/tracks_cmd');
    topCmd(opts);
  });

// ── plays ─────────────────────────────────────────────────────────────────────
const playsCmd = program.command('plays').description('Browse play history');

playsCmd
  .command('recent')
  .description('Show recent plays')
  .option(...dbOption)
  .option('-l, --limit <n>', 'Number of plays', (v) => parseInt(v, 10), 20)
  .option('--format <fmt>', 'Output format: table or json', 'table')
  .action((opts) => {
    const { recentCmd } = require('../commands/plays_cmd');
    recentCmd(opts);
  });

// ── sql ───────────────────────────────────────────────────────────────────────
const sqlCmd = program.command('sql').description('Direct SQL access to the database');

sqlCmd
  .command('query <sql>')
  .description('Execute a SQL query')
  .option(...dbOption)
  .option('--format <fmt>', 'Output format: table or json', 'table')
  .action((sql, opts) => {
    const { queryCmd } = require('../commands/sql_cmd');
    queryCmd(sql, opts);
  });

sqlCmd
  .command('tables')
  .description('List all tables')
  .option(...dbOption)
  .action((opts) => {
    const { tablesCmd } = require('../commands/sql_cmd');
    tablesCmd(opts);
  });

sqlCmd
  .command('schema [table]')
  .description('Show CREATE TABLE schema')
  .option(...dbOption)
  .action((table, opts) => {
    const { schemaCmd } = require('../commands/sql_cmd');
    schemaCmd(table, opts);
  });

sqlCmd
  .command('rows <table>')
  .description('Show rows from a table')
  .option(...dbOption)
  .option('-l, --limit <n>', 'Number of rows', (v) => parseInt(v, 10), 20)
  .action((table, opts) => {
    const { rowsCmd } = require('../commands/sql_cmd');
    rowsCmd(table, opts);
  });

// ── web ───────────────────────────────────────────────────────────────────────
program
  .command('web')
  .description('Start the web interface')
  .option(...dbOption)
  .option('-p, --port <n>', 'Port to listen on', (v) => parseInt(v, 10), 3000)
  .action((opts) => {
    if (opts.database) process.env.SCROBBLEDB_PATH = require('path').resolve(opts.database);
    if (opts.port) process.env.PORT = String(opts.port);
    require('../server');
  });

program.parse();
