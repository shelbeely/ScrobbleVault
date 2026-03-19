/**
 * Stats component — renders OverviewStats and optionally the top 5 yearly rollups.
 */

import React from "react";
import { Box, Text } from "ink";
import type { OverviewStats, YearlyRollup } from "../../queries";

interface StatsProps {
  stats: OverviewStats;
  yearly?: YearlyRollup[];
}

function StatRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <Box>
      <Box width={22}>
        <Text dimColor>{label}:</Text>
      </Box>
      <Text color="white">{value}</Text>
    </Box>
  );
}

export function Stats({ stats, yearly }: StatsProps): React.ReactElement {
  const top5 = yearly ? yearly.slice(0, 5) : [];

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text bold color="cyan">
          Overview
        </Text>
        <Text dimColor>{"─".repeat(44)}</Text>
        <StatRow label="Total Scrobbles" value={stats.total_scrobbles.toLocaleString()} />
        <StatRow label="Unique Artists" value={stats.unique_artists.toLocaleString()} />
        <StatRow label="Unique Albums" value={stats.unique_albums.toLocaleString()} />
        <StatRow label="Unique Tracks" value={stats.unique_tracks.toLocaleString()} />
        <StatRow label="First Scrobble" value={stats.first_scrobble ?? "—"} />
        <StatRow label="Last Scrobble" value={stats.last_scrobble ?? "—"} />
      </Box>

      {top5.length > 0 && (
        <Box flexDirection="column">
          <Text bold color="cyan">
            Top Years
          </Text>
          <Text dimColor>{"─".repeat(44)}</Text>
          {top5.map(y => (
            <StatRow
              key={y.year}
              label={String(y.year)}
              value={`${y.scrobbles.toLocaleString()} scrobbles  (${y.unique_artists} artists, ${y.unique_albums} albums)`}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
