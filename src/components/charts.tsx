"use client";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

const AXIS = { stroke: "#64748b", fontSize: 11 };
const GRID = "#243040";
const tooltipStyle = {
  background: "#121820",
  border: "1px solid #243040",
  borderRadius: 8,
  fontSize: 12,
};

export function TrendArea({
  data,
  keys,
}: {
  data: Record<string, number | string>[];
  keys: { key: string; color: string; name: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <defs>
          {keys.map((k) => (
            <linearGradient key={k.key} id={`g-${k.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={k.color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={k.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" {...AXIS} interval={14} />
        <YAxis {...AXIS} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k) => (
          <Area
            key={k.key}
            type="monotone"
            dataKey={k.key}
            name={k.name}
            stroke={k.color}
            fill={`url(#g-${k.key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ForecastChart({ data }: { data: Record<string, unknown>[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...AXIS} interval={5} />
        <YAxis {...AXIS} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="actual" name="Actual" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="upper" name="Upper" stroke="#2dd4bf" strokeWidth={1} strokeDasharray="2 2" dot={false} connectNulls />
        <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#2dd4bf" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="lower" name="Lower" stroke="#2dd4bf" strokeWidth={1} strokeDasharray="2 2" dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SimpleBar({
  data,
  dataKey,
  color = "#2dd4bf",
  colorByCell,
  height = 260,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  color?: string;
  colorByCell?: (row: Record<string, unknown>) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis {...AXIS} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {data.map((row, i) => (
            <Cell key={i} fill={colorByCell ? colorByCell(row) : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
