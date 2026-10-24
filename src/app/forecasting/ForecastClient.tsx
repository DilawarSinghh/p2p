"use client";
import { useState, useMemo } from "react";
import { Card, Stat } from "@/components/ui";
import { ForecastChart } from "@/components/charts";
import type { Building } from "@/lib/types";
import type { ForecastResult } from "@/lib/forecast";

const METRICS = [
  { key: "electricity_kwh", label: "Electricity (kWh)" },
  { key: "water_litres", label: "Water (L)" },
  { key: "footfall", label: "Footfall" },
] as const;

export default function ForecastClient({
  buildings,
  data,
}: {
  buildings: Building[];
  data: Record<string, Record<string, ForecastResult>>;
}) {
  const [building, setBuilding] = useState("B07");
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("electricity_kwh");
  const [horizon, setHorizon] = useState<6 | 12>(12);

  const fc = data[building][metric];

  const chartData = useMemo(() => {
    const pts = fc.points.filter((p) => !p.is_future || p.timestamp <= futureCutoff(fc, horizon));
    return pts.map((p) => ({
      label: p.timestamp.slice(5, 16),
      actual: p.actual,
      forecast: p.forecast,
      upper: p.upper,
      lower: p.lower,
    }));
  }, [fc, horizon]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select value={building} onChange={(e) => setBuilding(e.target.value)} className="bg-panel2 border border-border rounded px-3 py-1.5 text-sm">
          {buildings.map((b) => (
            <option key={b.building_id} value={b.building_id}>{b.building_id} · {b.building_name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {METRICS.map((m) => (
            <button key={m.key} className={`btn text-xs ${metric === m.key ? "btn-accent" : ""}`} onClick={() => setMetric(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {([6, 12] as const).map((h) => (
            <button key={h} className={`btn text-xs ${horizon === h ? "btn-accent" : ""}`} onClick={() => setHorizon(h)}>
              +{h}h
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Backtest MAE" value={fc.mae} sub={METRICS.find((m) => m.key === metric)?.label} />
        <Stat label="Backtest MAPE" value={`${fc.mape}%`} sub="hold-out 20%" tone="accent" />
        <Stat label="Horizon" value={`+${horizon}h`} sub="ahead of now" />
        <Stat
          label="Spike Alert"
          value={fc.spike_warning ? `+${fc.spike_warning.pct_above}%` : "none"}
          sub={fc.spike_warning ? `at ${fc.spike_warning.at.slice(5, 16)}` : "within normal band"}
          tone={fc.spike_warning ? "warn" : "good"}
        />
      </div>

      <Card title={`Forecast — ${building} · ${METRICS.find((m) => m.key === metric)?.label}`}>
        <ForecastChart data={chartData} />
        {fc.spike_warning && (
          <div className="mt-2 text-xs bg-warn/10 border border-warn/30 rounded p-2 text-warn">
            ⚑ Predicted spike: {fc.spike_warning.expected} vs baseline {fc.spike_warning.baseline} (+{fc.spike_warning.pct_above}%)
            at {fc.spike_warning.at.slice(0, 16)} — pre-position staff / load-shift before the surge.
          </div>
        )}
      </Card>

      <TradeoffPanel />
    </div>
  );
}

function futureCutoff(fc: ForecastResult, horizon: number): string {
  const futures = fc.points.filter((p) => p.is_future);
  return futures[Math.min(horizon, futures.length) - 1]?.timestamp ?? "9999";
}

function TradeoffPanel() {
  const rows = [
    {
      model: "Ridge Autoregression (chosen · edge)",
      ram: "< 2 MB",
      latency: "< 1 ms",
      acc: "~ good MAPE",
      hw: "ESP32 / Pi Zero 2W",
      gpu: "none",
      chosen: true,
    },
    {
      model: "Quantized Gradient-Boosted Trees",
      ram: "< 5 MB",
      latency: "< 15 ms",
      acc: "slightly better",
      hw: "Raspberry Pi 4",
      gpu: "none",
      chosen: false,
    },
    {
      model: "Deep LSTM / Transformer",
      ram: "> 500 MB",
      latency: "50–300 ms",
      acc: "best (marginal)",
      hw: "cloud GPU",
      gpu: "required",
      chosen: false,
    },
  ];
  return (
    <Card title="Edge Accuracy–Compute Trade-off">
      <p className="text-[11px] text-muted mb-3">
        A deep sequence model wins on raw accuracy by only a small margin here, but needs a cloud GPU and 50–300 ms per
        inference. The ridge autoregression runs on a $5 micro-controller in under a millisecond with no connectivity
        dependency — the right choice when forecasts must survive gateway dropouts.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="py-1.5">Model</th>
              <th>RAM</th>
              <th>Latency</th>
              <th>Accuracy</th>
              <th>Hardware</th>
              <th>GPU</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.model} className={`border-b border-border/40 ${r.chosen ? "bg-accent/10" : ""}`}>
                <td className="py-2">{r.chosen && <span className="text-accent mr-1">✓</span>}{r.model}</td>
                <td>{r.ram}</td>
                <td>{r.latency}</td>
                <td>{r.acc}</td>
                <td>{r.hw}</td>
                <td className={r.gpu === "none" ? "text-good" : "text-danger"}>{r.gpu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
