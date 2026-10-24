"use client";
import { useState, useEffect, useRef } from "react";
import { Card, Stat } from "@/components/ui";
import { SimpleBar } from "@/components/charts";

interface Burst {
  received_at: string;
  packets: number;
  captured_hours: string[];
  max_lag: number;
  buffered: number;
  duplicates: number;
}
interface Overview {
  totals: { hourly: number; buffered: number; duplicates: number; buffer_threshold: number };
  buckets: { name: string; count: number }[];
  perBuilding: { building_id: string; name: string; total: number; buffered: number; duplicates: number; avg_lag: number }[];
  sources: { source: string; cadence: string; rows: number; note: string }[];
}

export default function FusionClient({
  overview,
  timelines,
}: {
  overview: Overview;
  timelines: Record<string, Burst[]>;
}) {
  const buffered = overview.perBuilding.filter((b) => b.buffered > 0).sort((a, b) => b.buffered - a.buffered);
  const [sel, setSel] = useState(buffered[0]?.building_id ?? "B04");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Hourly Packets" value={overview.totals.hourly.toLocaleString()} sub="async IoT stream" />
        <Stat label="Buffered (dropout recovery)" value={overview.totals.buffered} sub={`lag > ${overview.totals.buffer_threshold}m`} tone="warn" />
        <Stat label="Duplicate Retransmits" value={overview.totals.duplicates} sub="deduplicated" tone="danger" />
        <Stat label="Fused Sources" value="3" sub="IoT · smart-bin · manual" tone="accent" />
      </div>

      <Card title="Asynchronous Stream Alignment">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {overview.sources.map((s) => (
            <div key={s.source} className="stat">
              <div className="text-sm font-semibold text-slate-200">{s.source}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="pill bg-accent/15 text-accent">{s.cadence}</span>
                <span className="text-xs text-muted">{s.rows.toLocaleString()} rows</span>
              </div>
              <div className="text-[11px] text-muted mt-2">{s.note}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted mt-3">
          Fusion strategy: hourly meters are the time spine; smart-bin events and shift logs are joined on
          <span className="text-slate-300"> building_id + nearest timestamp</span>. Offline buildings are never dropped —
          their buffered packets are replayed on reconnect and reconciled against manual logs.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Ingestion Lag Distribution">
          <SimpleBar
            data={overview.buckets}
            dataKey="count"
            colorByCell={(r) => (String(r.name).includes("buffered") || String(r.name).includes("240") ? "#fbbf24" : String(r.name).includes("120") ? "#38bdf8" : "#2dd4bf")}
          />
          <p className="text-[11px] text-muted mt-2">
            Baseline server lag is ~60–68 min. Packets beyond {overview.totals.buffer_threshold} min indicate a gateway
            buffered a burst during a dropout and flushed it on reconnection.
          </p>
        </Card>

        <Card title="Per-Building Connectivity Health">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted text-left border-b border-border">
                <th className="py-1.5">Building</th>
                <th className="text-right">Packets</th>
                <th className="text-right">Buffered</th>
                <th className="text-right">Dup</th>
                <th className="text-right">Avg lag</th>
              </tr>
            </thead>
            <tbody>
              {overview.perBuilding.map((b) => (
                <tr
                  key={b.building_id}
                  className={`border-b border-border/40 cursor-pointer hover:bg-panel2 ${sel === b.building_id ? "bg-accent/10" : ""}`}
                  onClick={() => setSel(b.building_id)}
                >
                  <td className="py-1.5">{b.building_id} · {b.name}</td>
                  <td className="text-right">{b.total}</td>
                  <td className="text-right text-warn">{b.buffered || "—"}</td>
                  <td className="text-right text-danger">{b.duplicates || "—"}</td>
                  <td className="text-right text-muted">{b.avg_lag}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <BufferSimulator buildingId={sel} bursts={timelines[sel] ?? []} setSel={setSel} buffered={buffered.map((b) => b.building_id)} />
    </div>
  );
}

function BufferSimulator({
  buildingId,
  bursts,
  setSel,
  buffered,
}: {
  buildingId: string;
  bursts: Burst[];
  setSel: (b: string) => void;
  buffered: string[];
}) {
  const [phase, setPhase] = useState<"idle" | "offline" | "buffering" | "flushing" | "reconciled">("idle");
  const [queue, setQueue] = useState<string[]>([]);
  const [flushed, setFlushed] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const burst = bursts[0];

  const run = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setQueue([]);
    setFlushed([]);
    setPhase("offline");
    const hours = burst?.captured_hours ?? [];
    // buffer packets one by one
    hours.forEach((h, i) => {
      timers.current.push(
        setTimeout(() => {
          setPhase("buffering");
          setQueue((q) => [...q, h]);
        }, 300 + i * 250)
      );
    });
    // flush burst
    timers.current.push(
      setTimeout(() => setPhase("flushing"), 300 + hours.length * 250 + 400)
    );
    hours.forEach((h, i) => {
      timers.current.push(
        setTimeout(() => {
          setFlushed((f) => [...f, h]);
          setQueue((q) => q.slice(1));
        }, 300 + hours.length * 250 + 700 + i * 180)
      );
    });
    timers.current.push(
      setTimeout(() => setPhase("reconciled"), 300 + hours.length * 250 + 700 + hours.length * 180 + 300)
    );
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    setPhase("idle");
    setQueue([]);
    setFlushed([]);
  }, [buildingId]);

  const phaseColor = {
    idle: "text-muted",
    offline: "text-danger",
    buffering: "text-warn",
    flushing: "text-accent2",
    reconciled: "text-good",
  }[phase];

  return (
    <Card
      title={`Edge Offline Buffer Replay — ${buildingId}`}
      right={
        <div className="flex gap-2 items-center">
          <select value={buildingId} onChange={(e) => setSel(e.target.value)} className="bg-panel2 border border-border rounded px-2 py-1 text-xs">
            {buffered.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <button className="btn btn-accent text-xs" onClick={run} disabled={!burst}>
            ▶ Simulate dropout
          </button>
        </div>
      }
    >
      {!burst ? (
        <div className="text-sm text-muted py-6 text-center">No buffered burst detected for {buildingId}.</div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3 text-xs">
            <span className={`font-semibold uppercase ${phaseColor}`}>● {phase}</span>
            <span className="text-muted">
              Real burst: {burst.packets} packets flushed at {burst.received_at}, max lag {burst.max_lag}m
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="stat">
              <div className="label mb-2">① Local IndexedDB / SQLite queue</div>
              <div className="space-y-1 min-h-[120px]">
                {queue.map((h) => (
                  <div key={h} className="text-[11px] bg-warn/10 text-warn rounded px-2 py-1 border border-warn/30">⧗ {h}</div>
                ))}
                {queue.length === 0 && phase !== "idle" && <div className="text-[11px] text-muted">queue empty</div>}
              </div>
            </div>
            <div className="stat">
              <div className="label mb-2">② Burst flush on reconnect</div>
              <div className="text-center py-6">
                <div className={`text-3xl ${phase === "flushing" ? "text-accent2 animate-pulse" : "text-muted"}`}>⇄</div>
                <div className="text-[11px] text-muted mt-2">
                  {phase === "flushing" ? "transmitting burst batch…" : phase === "reconciled" ? "sync complete" : "awaiting reconnect"}
                </div>
              </div>
            </div>
            <div className="stat">
              <div className="label mb-2">③ Server ingest (dedup + reconcile)</div>
              <div className="space-y-1 min-h-[120px]">
                {flushed.map((h) => (
                  <div key={h} className="text-[11px] bg-good/10 text-good rounded px-2 py-1 border border-good/30">✓ {h}</div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted mt-3">
            Deterministic dedup on <span className="text-slate-300">(building_id, timestamp)</span> drops retry duplicates;
            delayed hours are back-filled into the dashboard without double-counting, and values are reconciled against
            any manual_logs recorded during the outage.
          </p>
        </>
      )}
    </Card>
  );
}
