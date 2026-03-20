/**
 * ScrobbleVault CLI entry point.
 *
 * Usage:
 *   bun run cli <command> [flags]
 *
 * Commands: stats, artists, albums, tracks, plays, search, export, help
 */

import React from "react";
import { render, Box, Text } from "ink";
import { openDb, initSchema, setupFts5 } from "../db";
import { getDefaultDbPath } from "../config";
import {
  getOverviewStats,
  getArtists,
  getAlbums,
  getTracks,
  getPlays,
  searchTracks,
  getYearlyRollup,
  parseRelativeDate,
} from "../queries";
import type { ArtistRow, AlbumRow, TrackRow, PlayRow } from "../queries";
import { Table } from "./components/Table";
import type { ColDef } from "./components/Table";
import { Stats } from "./components/Stats";
import { exportData } from "./export";
import type { ExportFormat, ExportType } from "./export";

// ─── Arg parser ───────────────────────────────────────────────────────────────

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string>;
}

type SortOrder = "asc" | "desc";

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  let command = "";

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i] ?? "";
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[name] = next;
        i += 2;
      } else {
        flags[name] = "true";
        i++;
      }
    } else if (command === "") {
      command = arg;
      i++;
    } else {
      positional.push(arg);
      i++;
    }
  }

  return { command, positional, flags };
}

function failCliValidation(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseLimitFlag(value: string | undefined, fallback = 20): number {
  if (value === undefined) return fallback;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    failCliValidation(`invalid --limit value "${value}". Expected a positive integer.`);
  }
  return limit;
}

function parseOrderFlag(value: string | undefined, fallback: SortOrder = "desc"): SortOrder {
  if (value === undefined) return fallback;
  const normalized = value.toLowerCase();
  if (normalized === "asc" || normalized === "desc") return normalized;
  failCliValidation(`invalid --order value "${value}". Expected "asc" or "desc".`);
}

// ─── Help screen ──────────────────────────────────────────────────────────────

function HelpScreen(): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1} paddingY={1}>
      <Text bold color="cyan">
        ScrobbleVault CLI
      </Text>

      <Box flexDirection="column">
        <Text bold color="white">
          Commands:
        </Text>
        <HelpRow cmd="stats" desc="Show overview statistics" />
        <HelpRow
          cmd="artists"
          desc="[--sort plays|name|recent] [--limit N] [--order asc|desc]"
        />
        <HelpRow
          cmd="albums"
          desc="[--sort plays|title|recent] [--limit N] [--order asc|desc]"
        />
        <HelpRow
          cmd="tracks"
          desc="[--sort plays|title|recent] [--limit N] [--order asc|desc]"
        />
        <HelpRow cmd="plays" desc="[--limit N] [--since DATE] [--until DATE]" />
        <HelpRow cmd='search <query>' desc="[--limit N]" />
        <HelpRow
          cmd="export"
          desc="--format csv|json --type artists|albums|tracks|plays"
        />
        <Box paddingLeft={2}>
          <Text dimColor>
            {"         "}[--limit N] [--output FILE]
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text bold color="white">
          Options:
        </Text>
        <OptionRow flag="--database <path>" desc="SQLite database path (default: XDG data dir)" />
        <OptionRow flag="--limit    <N>    " desc="Max rows to show (default: 20)" />
        <OptionRow flag="--sort     <field>" desc="Sort field" />
        <OptionRow flag="--order    <dir>  " desc="asc or desc (default: desc)" />
        <OptionRow flag="--since    <date> " desc='ISO date or "N days ago" (plays only)' />
        <OptionRow flag="--until    <date> " desc='ISO date or "N days ago" (plays only)' />
        <OptionRow flag="--format   csv|json" desc="Export format" />
        <OptionRow flag="--type     <type> " desc="What to export: artists|albums|tracks|plays" />
        <OptionRow flag="--output   <file> " desc="Write output to file instead of stdout" />
      </Box>
    </Box>
  );
}

function HelpRow({ cmd, desc }: { cmd: string; desc: string }): React.ReactElement {
  return (
    <Box paddingLeft={2}>
      <Box width={24}>
        <Text color="green">{cmd}</Text>
      </Box>
      <Text dimColor>{desc}</Text>
    </Box>
  );
}

function OptionRow({ flag, desc }: { flag: string; desc: string }): React.ReactElement {
  return (
    <Box paddingLeft={2}>
      <Box width={24}>
        <Text color="yellow">{flag}</Text>
      </Box>
      <Text dimColor>{desc}</Text>
    </Box>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const ARTIST_COLS: ColDef[] = [
  { header: "Artist",      width: 30 },
  { header: "Albums",      width: 6,  align: "right" },
  { header: "Tracks",      width: 6,  align: "right" },
  { header: "Plays",       width: 22, align: "right" }, // extra width for bar
  { header: "Last Played", width: 20 },
];

const ALBUM_COLS: ColDef[] = [
  { header: "Album",       width: 30 },
  { header: "Artist",      width: 24 },
  { header: "Tracks",      width: 6,  align: "right" },
  { header: "Plays",       width: 22, align: "right" },
  { header: "Last Played", width: 20 },
];

const TRACK_COLS: ColDef[] = [
  { header: "Track",       width: 28 },
  { header: "Artist",      width: 22 },
  { header: "Album",       width: 22 },
  { header: "Plays",       width: 22, align: "right" },
  { header: "Last Played", width: 20 },
];

const PLAY_COLS: ColDef[] = [
  { header: "Timestamp", width: 22 },
  { header: "Artist",    width: 22 },
  { header: "Album",     width: 22 },
  { header: "Track",     width: 26 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

const { command, positional, flags } = parseArgs(Bun.argv.slice(2));

const dbPath = flags["database"] ?? getDefaultDbPath();
const sortFlag = flags["sort"] ?? "";

/** Renders a static ink component, waits one tick for output to flush, then exits. */
async function renderAndExit(element: React.ReactElement): Promise<void> {
  const { unmount } = render(element);
  // Yield to the event loop so React can flush its render to stdout.
  await Bun.sleep(0);
  unmount();
  process.exit(0);
}

// Show help for unknown / missing commands.
if (
  command === "" ||
  command === "help" ||
  flags["help"] === "true" ||
  (command !== "stats" &&
    command !== "artists" &&
    command !== "albums" &&
    command !== "tracks" &&
    command !== "plays" &&
    command !== "search" &&
    command !== "export")
) {
  await renderAndExit(<HelpScreen />);
}

const limit = parseLimitFlag(flags["limit"]);
const orderFlag = parseOrderFlag(flags["order"]);

// ─── export command (no ink rendering) ───────────────────────────────────────

if (command === "export") {
  const format = (flags["format"] ?? "json") as ExportFormat;
  const type = (flags["type"] ?? "plays") as ExportType;
  const output = flags["output"];

  const db = openDb(dbPath);
  initSchema(db);
  setupFts5(db);

  await exportData(db, type, format, limit, output);
  process.exit(0);
}

// ─── All other commands — open DB, query, render ─────────────────────────────

const db = openDb(dbPath);
initSchema(db);
setupFts5(db);

switch (command) {
  case "stats": {
    const stats = getOverviewStats(db);
    const yearly = getYearlyRollup(db);
    await renderAndExit(<Stats stats={stats} yearly={yearly} />);
    break;
  }

  case "artists": {
    const sortBy = (["plays", "name", "recent"].includes(sortFlag)
      ? sortFlag
      : "plays") as "plays" | "name" | "recent";
    const rows: ArtistRow[] = getArtists(db, { limit, sortBy, order: orderFlag });
    const maxPlays = rows[0]?.play_count ?? 1;
    const cols = ARTIST_COLS.map((c, i) => i === 3 ? { ...c, barMax: maxPlays } : c);
    await renderAndExit(
      <Table<ArtistRow>
        columns={cols}
        rows={rows}
        keys={["artist_name", "album_count", "track_count", "play_count", "last_played"]}
        emptyMessage="No artists found."
      />,
    );
    break;
  }

  case "albums": {
    const sortBy = (["plays", "title", "recent"].includes(sortFlag)
      ? sortFlag
      : "plays") as "plays" | "title" | "recent";
    const rows: AlbumRow[] = getAlbums(db, { limit, sortBy, order: orderFlag });
    const maxPlays = rows[0]?.play_count ?? 1;
    const cols = ALBUM_COLS.map((c, i) => i === 3 ? { ...c, barMax: maxPlays } : c);
    await renderAndExit(
      <Table<AlbumRow>
        columns={cols}
        rows={rows}
        keys={["album_title", "artist_name", "track_count", "play_count", "last_played"]}
        emptyMessage="No albums found."
      />,
    );
    break;
  }

  case "tracks": {
    const sortBy = (["plays", "title", "recent"].includes(sortFlag)
      ? sortFlag
      : "plays") as "plays" | "title" | "recent";
    const rows: TrackRow[] = getTracks(db, { limit, sortBy, order: orderFlag });
    const maxPlays = rows[0]?.play_count ?? 1;
    const cols = TRACK_COLS.map((c, i) => i === 3 ? { ...c, barMax: maxPlays } : c);
    await renderAndExit(
      <Table<TrackRow>
        columns={cols}
        rows={rows}
        keys={["track_title", "artist_name", "album_title", "play_count", "last_played"]}
        emptyMessage="No tracks found."
      />,
    );
    break;
  }

  case "plays": {
    const since = flags["since"] ? parseRelativeDate(flags["since"]) : null;
    const until = flags["until"] ? parseRelativeDate(flags["until"]) : null;
    const rows: PlayRow[] = getPlays(db, { limit, since, until });
    await renderAndExit(
      <Table<PlayRow>
        columns={PLAY_COLS}
        rows={rows}
        keys={["timestamp", "artist_name", "album_title", "track_title"]}
        emptyMessage="No plays found."
      />,
    );
    break;
  }

  case "search": {
    const query = positional[0] ?? flags["query"] ?? "";
    if (query === "") {
      await renderAndExit(
        <Box>
          <Text color="red">Error: provide a search query, e.g.: bun cli search "radiohead"</Text>
        </Box>,
      );
      break;
    }
    const rows: TrackRow[] = searchTracks(db, query, limit);
    await renderAndExit(
      <Table<TrackRow>
        columns={TRACK_COLS}
        rows={rows}
        keys={["track_title", "artist_name", "album_title", "play_count", "last_played"]}
        emptyMessage={`No results for "${query}".`}
      />,
    );
    break;
  }
}
