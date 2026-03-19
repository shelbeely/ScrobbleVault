/**
 * Reusable ink table component.
 *
 * Renders a fixed-width table with bold-cyan headers, a dim separator,
 * and coloured rows (yellow for numbers, white for strings).
 */

import React from "react";
import { Box, Text } from "ink";

export interface ColDef {
  header: string;
  width: number;
  align?: "left" | "right";
}

interface TableProps<T extends object> {
  columns: ColDef[];
  rows: T[];
  /** Which keys to render, in column order. */
  keys: (keyof T)[];
  formatters?: Partial<Record<keyof T, (v: unknown) => string>>;
  emptyMessage?: string;
}

function padCell(str: string, width: number, align: "left" | "right"): string {
  const truncated = str.length > width ? str.slice(0, width - 3) + "..." : str;
  return align === "right" ? truncated.padStart(width) : truncated.padEnd(width);
}

export function Table<T extends object>(
  props: TableProps<T>,
): React.ReactElement {
  const { columns, rows, keys, formatters, emptyMessage = "No results." } = props;

  if (rows.length === 0) {
    return (
      <Box>
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }

  const separator = columns.map(col => "─".repeat(col.width)).join(" ");

  return (
    <Box flexDirection="column">
      {/* Header row */}
      <Box>
        {columns.map((col, ci) => (
          <Box key={ci} marginRight={1}>
            <Text bold color="cyan">
              {padCell(col.header, col.width, "left")}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Separator */}
      <Box>
        <Text dimColor>{separator}</Text>
      </Box>

      {/* Data rows */}
      {rows.map((row, ri) => (
        <Box key={ri}>
          {columns.map((col, ci) => {
            const key = keys[ci];
            if (key === undefined) {
              return (
                <Box key={ci} marginRight={1}>
                  <Text>{" ".repeat(col.width)}</Text>
                </Box>
              );
            }
            const raw: unknown = row[key];
            const formatter = formatters?.[key];
            const str = formatter ? formatter(raw) : raw == null ? "" : String(raw);
            const isNum = typeof raw === "number";
            const align = col.align ?? (isNum ? "right" : "left");
            const padded = padCell(str, col.width, align);
            return (
              <Box key={ci} marginRight={1}>
                <Text color={isNum ? "yellow" : "white"}>{padded}</Text>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
