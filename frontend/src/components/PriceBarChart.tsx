import { useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine';
import { theme } from '../styles/muiTheme';
import type { PriceQuantile } from '../api/spotPrices';
import type { PriceSlot } from '../lib/daySlots';
import { fixed } from '../lib/format';

const QUANTILE_COLOR: Record<PriceQuantile, string> = {
  Green: 'var(--color-q-green)',
  Yellow: 'var(--color-q-yellow)',
  Red: 'var(--color-q-red)',
};
const UNCLASSIFIED_COLOR = 'var(--color-neutral-400)';

export function PriceBarChart({ slots, height = 230 }: { slots: PriceSlot[]; height?: number }) {
  // 15-minute zones get pencil bars, hourly zones get chunky bars.
  const dense = slots.length > 48;

  const colors = useMemo(
    () => slots.map((s) => (s.quantile ? QUANTILE_COLOR[s.quantile] : UNCLASSIFIED_COLOR)),
    [slots],
  );
  const categories = useMemo(() => slots.map((s) => s.time), [slots]);

  // Label every 3rd hour, which is every 12th bar at PT15M and every 3rd at PT60M.
  const labelEvery = dense ? 12 : 3;

  // "Now" only exists on the day currently in view; on other days no slot contains it.
  const nowSlot = useMemo(() => {
    const now = Date.now();
    return slots.find((s) => now >= Date.parse(s.fromUtc) && now < Date.parse(s.toUtc));
  }, [slots]);

  return (
    <ThemeProvider theme={theme}>
      <BarChart
        height={height}
        dataset={slots}
        margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
        grid={{ horizontal: true }}
        skipAnimation
        borderRadius={dense ? 1 : 3}
        xAxis={[
          {
            dataKey: 'time',
            scaleType: 'band',
            // Gap as a share of the band, bigger at high slot counts so bars stay legible.
            categoryGapRatio: dense ? 0.45 : 0.28,
            // Per-bar colour via an ordinal map keyed on the category.
            colorMap: { type: 'ordinal', values: categories, colors },
            tickLabelInterval: (_value: unknown, index: number) => index % labelEvery === 0,
            // Axis labels are bare hours ("3", "15"); the tooltip keeps the full "03:00".
            valueFormatter: (value: string, ctx: { location: string }) =>
              ctx.location === 'tick' ? value.replace(/^0?(\d+):00$/, '$1') : value,
            disableTicks: true,
            disableLine: true,
            tickLabelStyle: { fontSize: 11, fill: 'var(--color-text-mute)' },
          },
        ]}
        yAxis={[
          {
            width: 44,
            disableTicks: true,
            disableLine: true,
            valueFormatter: (v: number) => fixed(v, 0),
            tickLabelStyle: { fontSize: 11, fill: 'var(--color-text-mute)' },
          },
        ]}
        series={[
          {
            dataKey: 'ct',
            label: 'Price',
            valueFormatter: (v: number | null) => (v == null ? 'no price' : `${fixed(v, 1)} c/kWh`),
          },
        ]}
        hideLegend
        sx={{
          '& .MuiChartsGrid-line': { stroke: 'var(--color-divider)' },
        }}
      >
        {nowSlot && (
          <ChartsReferenceLine
            x={nowSlot.time}
            label="now"
            labelAlign="start"
            lineStyle={{ stroke: 'var(--color-text)', strokeDasharray: '3 3', strokeWidth: 1.5 }}
            labelStyle={{ fontSize: 10, fill: 'var(--color-text)' }}
          />
        )}
      </BarChart>
    </ThemeProvider>
  );
}
