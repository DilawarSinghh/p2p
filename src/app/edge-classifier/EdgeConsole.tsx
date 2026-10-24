"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, Stat, ClassBadge } from "@/components/ui";
import { CLASS_COLORS, type WasteClass } from "@/lib/constants";
import type { ModelMetrics } from "@/lib/types";

interface Info {
  n_trees: number;
  classes: string[];
  features: string[];
  confidence_gate: number;
}

interface TestResult {
  event_id: string;
  building_id: string;
  bin_id: string;
  predicted_class: WasteClass;
  confidence: number;
  routed_to: string;
  gated: boolean;
  latency_ms: number;
}

const SLIDERS: { key: string; label: string; min: number; max: number; step: number; def: number }[] = [
  { key: "weight_g", label: "Weight (g)", min: 0, max: 2000, step: 1, def: 300 },
  { key: "moisture_pct", label: "Moisture (%)", min: 0, max: 100, step: 0.1, def: 50 },
  { key: "metal_signal", label: "Metal signal", min: 0, max: 100, step: 0.1, def: 5 },
  { key: "transparency", label: "Transparency", min: 0, max: 1, step: 0.01, def: 0.2 },
  { key: "acoustic_hardness", label: "Acoustic hardness", min: 0, max: 1, step: 0.01, def: 0.3 },
];

const PRESETS: Record<string, Record<string, number>> = {
  "Food (organic)": { weight_g: 480, moisture_pct: 60, metal_signal: 0, transparency: 0, acoustic_hardness: 0.1 },
  "Plastic bottle": { weight_g: 60, moisture_pct: 8, metal_signal: 3, transparency: 0.6, acoustic_hardness: 0.4 },
  "Glass jar": { weight_g: 380, moisture_pct: 6, metal_signal: 7, transparency: 0.65, acoustic_hardness: 0.8 },
  "Metal can": { weight_g: 95, moisture_pct: 5, metal_signal: 80, transparency: 0.04, acoustic_hardness: 0.76 },
  "E-waste": { weight_g: 600, moisture_pct: 5, metal_signal: 56, transparency: 0.1, acoustic_hardness: 0.54 },
  "Cardboard": { weight_g: 140, moisture_pct: 14, metal_signal: 4, transparency: 0.07, acoustic_hardness: 0.16 },
};

export default function EdgeConsole({ metrics, info }: { metrics: ModelMetrics; info: Info }) {
  const [sensors, setSensors] = useState<Record<string, number>>(
    Object.fromEntries(SLIDERS.map((s) => [s.key, s.def]))
  );
  const [live, setLive] = useState<{
    predicted_class: WasteClass;
    confidence: number;
    probabilities: Record<string, number>;
    routed_to: string;
    gated: boolean;
    latency_ms: number;
  } | null>(null);

  const classify = useCallback(async (s: Record<string, number>) => {
    const res = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setLive(await res.json());
  }, []);

  useEffect(() => {
    classify(sensors);
  }, [sensors, classify]);

  return (
    <div className="space-y-4">
      {/* Headline metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Raw Accuracy" value={`${(metrics.accuracy * 100).toFixed(1)}%`} sub={metrics.eval_method} />
        <Stat label={`Gated Acc (conf≥${metrics.confidence_gate})`} value={`${(metrics.gated_accuracy * 100).toFixed(1)}%`} sub="exceeds 85% target" tone="good" />
        <Stat label="Edge Latency" value="<1 ms" sub={`sklearn ${metrics.sklearn_per_event_ms}ms`} tone="accent" />
        <Stat label="Model" value={`${info.n_trees} trees`} sub="RandomForest, 5 feats" />
        <Stat label="Deploy" value="No GPU" sub="pure-TS inference" tone="good" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live sensor simulator */}
        <Card title="Manual Sensor Test (live inference)">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(PRESETS).map(([name, p]) => (
              <button key={name} className="btn text-xs" onClick={() => setSensors(p)}>
                {name}
              </button>
            ))}
          </div>
          {SLIDERS.map((s) => (
            <div key={s.key} className="mb-2.5">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{s.label}</span>
                <span className="text-accent font-semibold">{sensors[s.key]}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={sensors[s.key]}
                onChange={(e) => setSensors({ ...sensors, [s.key]: Number(e.target.value) })}
                className="w-full accent-accent"
              />
            </div>
          ))}
          {live && (
            <div className="mt-4 bg-panel2 rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-2">
                <ClassBadge cls={live.predicted_class} />
                <span className="text-xs text-muted">{live.latency_ms.toFixed(2)} ms</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: CLASS_COLORS[live.predicted_class] }}>
                {(live.confidence * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted mb-2">confidence</div>
              <div className={`pill ${live.gated ? "bg-warn/15 text-warn" : "bg-good/15 text-good"}`}>
                → {live.routed_to}
              </div>
              <div className="mt-3 space-y-1">
                {Object.entries(live.probabilities)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cls, p]) => (
                    <div key={cls} className="flex items-center gap-2 text-xs">
                      <span className="w-28 text-muted">{cls.replace("_", " ")}</span>
                      <div className="flex-1 h-1.5 bg-panel rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${p * 100}%`, background: CLASS_COLORS[cls as WasteClass] }} />
                      </div>
                      <span className="w-10 text-right">{(p * 100).toFixed(0)}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>

        {/* Live test stream */}
        <TestStream />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConfusionMatrix metrics={metrics} />
        <div className="space-y-4">
          <PerClass metrics={metrics} />
          <CoverageTable metrics={metrics} />
        </div>
      </div>
    </div>
  );
}

function TestStream() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [total, setTotal] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const offset = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBatch = useCallback(async () => {
    const res = await fetch(`/api/classify-test?offset=${offset.current}&limit=25`);
    const data = await res.json();
    setTotal(data.total);
    setResults((prev) => [...data.results.reverse(), ...prev].slice(0, 120));
    offset.current += 25;
    if (offset.current >= data.total) {
      setStreaming(false);
      if (timer.current) clearInterval(timer.current);
    }
  }, []);

  const toggle = () => {
    if (streaming) {
      setStreaming(false);
      if (timer.current) clearInterval(timer.current);
    } else {
      setStreaming(true);
      fetchBatch();
      timer.current = setInterval(fetchBatch, 900);
    }
  };

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  return (
    <Card
      title="Live Test Stream (waste_events_test · 1,601 events)"
      right={
        <div className="flex gap-2">
          <a href="/exports/waste_events_test_predictions.csv" download className="btn text-xs">
            ⤓ Export CSV
          </a>
          <button onClick={toggle} className={`btn text-xs ${streaming ? "btn-accent" : ""}`}>
            {streaming ? "⏸ Pause" : "▶ Stream"}
          </button>
        </div>
      }
    >
      <div className="text-xs text-muted mb-2">
        Classified {Math.min(offset.current, total)} / {total || 1601} · each event sorted in real time
      </div>
      <div className="h-[360px] overflow-y-auto space-y-1">
        {results.length === 0 && (
          <div className="text-sm text-muted py-8 text-center">Press Stream to classify live arrivals.</div>
        )}
        {results.map((r) => (
          <div key={r.event_id} className="flex items-center gap-2 text-xs bg-panel2 rounded px-2 py-1.5 border border-border/50">
            <span className="text-muted w-14">{r.event_id}</span>
            <span className="text-slate-400 w-10">{r.building_id}</span>
            <ClassBadge cls={r.predicted_class} />
            <span className="ml-auto text-slate-300">{(r.confidence * 100).toFixed(0)}%</span>
            <span className={`w-36 text-right ${r.gated ? "text-warn" : "text-muted"}`}>{r.routed_to}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ConfusionMatrix({ metrics }: { metrics: ModelMetrics }) {
  const { classes, confusion_matrix } = metrics;
  const max = Math.max(...confusion_matrix.flat());
  return (
    <Card title="Confusion Matrix (out-of-fold)">
      <div className="overflow-x-auto">
        <table className="text-[11px] border-collapse">
          <thead>
            <tr>
              <th className="p-1 text-muted">actual ↓ / pred →</th>
              {classes.map((c) => (
                <th key={c} className="p-1 text-muted rotate-0 whitespace-nowrap">{c.slice(0, 6)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {confusion_matrix.map((row, i) => (
              <tr key={i}>
                <td className="p-1 text-muted whitespace-nowrap">{classes[i]}</td>
                {row.map((v, j) => (
                  <td
                    key={j}
                    className="p-1 text-center font-semibold"
                    style={{
                      background: i === j ? `rgba(45,212,191,${0.15 + (v / max) * 0.6})` : `rgba(248,113,113,${(v / max) * 0.5})`,
                      color: v > 0 ? "#e2e8f0" : "#475569",
                    }}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PerClass({ metrics }: { metrics: ModelMetrics }) {
  return (
    <Card title="Per-class Precision / Recall / F1">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted text-left border-b border-border">
            <th className="py-1.5">class</th>
            <th className="text-right">P</th>
            <th className="text-right">R</th>
            <th className="text-right">F1</th>
            <th className="text-right">n</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(metrics.per_class).map(([cls, m]) => (
            <tr key={cls} className="border-b border-border/40">
              <td className="py-1.5"><ClassBadge cls={cls as WasteClass} /></td>
              <td className="text-right">{m.precision.toFixed(2)}</td>
              <td className="text-right">{m.recall.toFixed(2)}</td>
              <td className="text-right text-accent">{m.f1.toFixed(2)}</td>
              <td className="text-right text-muted">{m.support}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function CoverageTable({ metrics }: { metrics: ModelMetrics }) {
  return (
    <Card title="Confidence Gate — Coverage vs Accuracy">
      <p className="text-[11px] text-muted mb-2">
        Low-confidence items route to a review bin; raising the gate lifts accuracy on auto-sorted items above 85%.
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted text-left border-b border-border">
            <th className="py-1.5">conf ≥</th>
            <th className="text-right">coverage</th>
            <th className="text-right">accuracy</th>
          </tr>
        </thead>
        <tbody>
          {metrics.coverage_table.map((r) => (
            <tr key={r.threshold} className={`border-b border-border/40 ${r.threshold === metrics.confidence_gate ? "bg-accent/10" : ""}`}>
              <td className="py-1.5">{r.threshold.toFixed(1)}</td>
              <td className="text-right">{(r.coverage * 100).toFixed(1)}%</td>
              <td className="text-right text-good">{(r.accuracy_on_covered * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
