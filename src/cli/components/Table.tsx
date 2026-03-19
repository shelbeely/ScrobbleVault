/**
 * Reusable ink table component.
 *
 * Renders a fixed-width table with bold-cyan headers, a dim separator,
 * and coloured rows (yellow for numbers, white for strings).
 *
 * Numeric columns may optionally display an inline progress bar by setting
 * `barMax` on the ColDef to the maximum value across all rows.
 */

import React from "react";
import { Box, Text } from "ink";
import { ProgressBar } from "./ProgressBar";

export interface ColDef {
  header: string;
  width: number;
  align?: "left" | "right";
  /**
   * When set, numeric cells in this column render a mini progress bar
   * proportional to value/barMax immediately after the number.
   * The bar is 12 chars wide and does not consume extra column space —
   * size the column width to accommodate both number and bar.
   */
  barMax?: number;
}

interface TableProps<T extends object> {
  columns: ColDef[];
  rows: T[];
  /** Which keys to render, in column order. */
  keys: (keyof T)[];
  formatters?: Partial<Record<keyof T, (v: unknown) => string>>;
  emptyMessage?: string;
}

const BAR_WIDTH = 12;

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
            const showBar = isNum && col.barMax !== undefined && col.barMax > 0;

            // When a bar is shown the number occupies the left portion of the
            // cell and the bar fills the right BAR_WIDTH chars.
            const numWidth = showBar ? col.width - BAR_WIDTH - 1 : col.width;
            const padded = padCell(str, numWidth, align);

            return (
              <Box key={ci} marginRight={1}>
                <Text color={isNum ? "yellow" : "white"}>{padded}</Text>
                {showBar && typeof raw === "number" && (
                  <>
                    <Text> </Text>
                    <ProgressBar
                      value={raw / col.barMax!}
                      width={BAR_WIDTH}
                      color="cyan"
                    />
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
