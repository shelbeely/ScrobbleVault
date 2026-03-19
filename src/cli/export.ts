/**
 * Export helpers for the ScrobbleVault CLI.
 *
 * Writes artist/album/track/play data in CSV or JSON format to stdout or a file.
 * File I/O uses Bun.write() (async); stdout uses process.stdout.write() (sync).
 */

import type { Database } from "bun:sqlite";
import { getArtists, getAlbums, getTracks, getPlays } from "../queries";

export type ExportFormat = "csv" | "json";
export type ExportType = "artists" | "albums" | "tracks" | "plays";

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function csvQuote(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(","),
    ...rows.map(row => headers.map(h => csvQuote(row[h])).join(",")),
  ];
  return lines.join("\n") + "\n";
}

// ─── Main export function ─────────────────────────────────────────────────────

/**
 * Export data in CSV or JSON format, writing to stdout or a file.
 * If `outputPath` is given, the file is written with Bun.write();
 * otherwise the output is printed to process.stdout.
 */
export async function exportData(
  db: Database,
  type: ExportType,
  format: ExportFormat,
  limit: number,
  outputPath?: string,
): Promise<void> {
  let rows: Record<string, unknown>[];

  switch (type) {
    case "artists":
      rows = getArtists(db, { limit }) as unknown as Record<string, unknown>[];
      break;
    case "albums":
      rows = getAlbums(db, { limit }) as unknown as Record<string, unknown>[];
      break;
    case "tracks":
      rows = getTracks(db, { limit }) as unknown as Record<string, unknown>[];
      break;
    case "plays":
      rows = getPlays(db, { limit }) as unknown as Record<string, unknown>[];
      break;
  }

  const output = format === "json" ? JSON.stringify(rows, null, 2) + "\n" : toCsv(rows);

  if (outputPath) {
    await Bun.write(outputPath, output);
  } else {
    process.stdout.write(output);
  }
}
