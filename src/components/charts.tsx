import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PercentileBand } from '../types';
import { formatCompactCurrency } from '../utils/format';

const AXIS = { fontSize: 11, fill: 'var(--text-dim)' };

/**
 * Percentile-band chart: shaded 10-90 and 25-75 ranges with a median line.
 * We avoid drawing thousands of individual paths by design.
 */
export function BandChart({
  bands,
  height = 300,
  yFormat = formatCompactCurrency,
  label,
}: {
  bands: PercentileBand[];
  height?: number;
  yFormat?: (v: number) => string;
  label?: string;
}): JSX.Element {
  const data = bands.map((b) => ({
    age: b.age,
    p10: b.p10,
    band1090: b.p90 - b.p10,
    p25: b.p25,
    band2575: b.p75 - b.p25,
    p50: b.p50,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="age" tick={AXIS} tickLine={false} />
        <YAxis tickFormatter={(v) => yFormat(v)} tick={AXIS} tickLine={false} width={62} />
        <RTooltip
          formatter={(v: number, n: string) => [yFormat(v), n]}
          labelFormatter={(l) => `Age ${l}`}
          contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
        />
        {/* 10-90 band (stacked area: transparent base + visible span). */}
        <Area type="monotone" dataKey="p10" stackId="a" stroke="none" fill="transparent" isAnimationActive={false} />
        <Area type="monotone" dataKey="band1090" name="10th–90th pct" stackId="a" stroke="none" fill="var(--accent)" fillOpacity={0.15} isAnimationActive={false} />
        <Area type="monotone" dataKey="p25" stackId="b" stroke="none" fill="transparent" isAnimationActive={false} />
        <Area type="monotone" dataKey="band2575" name="25th–75th pct" stackId="b" stroke="none" fill="var(--accent)" fillOpacity={0.22} isAnimationActive={false} />
        <Line type="monotone" dataKey="p50" name={label ?? 'Median'} stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({
  data,
  xKey,
  yKey,
  height = 260,
  yFormat = formatCompactCurrency,
  color = 'var(--accent-2)',
}: {
  data: Array<Record<string, number | string>>;
  xKey: string;
  yKey: string;
  height?: number;
  yFormat?: (v: number) => string;
  color?: string;
}): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} />
        <YAxis tickFormatter={(v) => yFormat(Number(v))} tick={AXIS} tickLine={false} width={62} />
        <RTooltip
          formatter={(v: number) => yFormat(v)}
          contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
        />
        <Bar dataKey={yKey} fill={color} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TwoLineChart({
  data,
  xKey,
  aKey,
  bKey,
  aLabel,
  bLabel,
  height = 280,
  yFormat = formatCompactCurrency,
}: {
  data: Array<Record<string, number>>;
  xKey: string;
  aKey: string;
  bKey: string;
  aLabel: string;
  bLabel: string;
  height?: number;
  yFormat?: (v: number) => string;
}): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} />
        <YAxis tickFormatter={(v) => yFormat(v)} tick={AXIS} tickLine={false} width={62} />
        <RTooltip
          formatter={(v: number, n: string) => [yFormat(v), n]}
          labelFormatter={(l) => `Age ${l}`}
          contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
        />
        <Line type="monotone" dataKey={aKey} name={aLabel} stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey={bKey} name={bLabel} stroke="var(--accent-2)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
