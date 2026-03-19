/**
 * Ink progress bar component.
 *
 * Renders a Unicode block progress bar:
 *   ████████████░░░░░░░░  60%
 */

import React from "react";
import { Text } from "ink";

interface ProgressBarProps {
  /** Fraction filled, 0–1. Values outside this range are clamped. */
  value: number;
  /** Total bar width in characters (default: 20). */
  width?: number;
  /** Ink color for the filled portion (default: "cyan"). */
  color?: string;
  /** Show a percentage label after the bar (default: false). */
  showPercent?: boolean;
}

export function ProgressBar({
  value,
  width = 20,
  color = "cyan",
  showPercent = false,
}: ProgressBarProps): React.ReactElement {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const filled  = Math.round(clamped * width);
  const empty   = width - filled;
  const bar     = "█".repeat(filled) + "░".repeat(empty);
  const pct     = showPercent ? ` ${Math.round(clamped * 100)}%` : "";
  return (
    <Text color={color}>
      {bar}
      {pct}
    </Text>
  );
}
