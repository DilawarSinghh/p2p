"use client";
import { useState } from "react";
import { Card, Stat } from "@/components/ui";
import type { Anomaly } from "@/lib/anomaly";

export default function RootCauseClient({ anomalies }: { anomalies: Anomaly[] }) {
  const [filter, setFilter] = useState<string>("all");
  const metrics = ["all", ...new Set(anomalies.map((a) => a.metric))];
  const filtered = filter === "all" ? anomalies : anomalies.filter((a) => a.metric === filter);

  const totalSavings = anomalies.reduce(
    (s, a) => s + a.actions.reduce((x, act) => x + act.est_rs_saved, 0),
    0
  );
  const totalCo2 = anomalies.reduce(
    (s, a) => s + a.actions.reduce((x, act) => x + act.est_co2_saved, 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Anomalies (z > 2.5)" value={anomalies.length} sub="daily_summary scan" tone="warn" />
        <Stat label="With Attributed Cause" value={anomalies.filter((a) => a.evidence.length > 0).length} sub="log/calendar matched" tone="accent" />
        <Stat label="Est. Savings Potential" value={`Rs. ${Math.round(totalSavings).toLocaleString()}`} tone="good" />
        <Stat label="Est. CO₂ Avoided" value={`${Math.round(totalCo2)} kg`} tone="good" />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {metrics.map((m) => (
          <button key={m} className={`btn text-xs capitalize ${filter === m ? "btn-accent" : ""}`} onClick={() => setFilter(m)}>
            {m}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((a) => (
          <AnomalyCard key={a.id} a={a} />
        ))}
      </div>
    </div>
  );
}

function AnomalyCard({ a }: { a: Anomaly }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center">
          <div className={`text-lg font-bold ${a.direction === "spike" ? "text-danger" : "text-accent2"}`}>
            {a.direction === "spike" ? "▲" : "▼"}
          </div>
          <div className="text-[10px] text-muted">z={a.z_score}</div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="pill bg-accent/15 text-accent">{a.building_id}</span>
            <span className="text-xs text-muted">{a.date}</span>
            <span className="pill bg-panel2 text-slate-300 capitalize">{a.metric}</span>
            <span className={`text-xs font-semibold ${a.direction === "spike" ? "text-danger" : "text-accent2"}`}>
              {a.pct_deviation > 0 ? "+" : ""}{a.pct_deviation}% vs baseline {a.baseline}
            </span>
          </div>
          <p className="text-sm text-slate-200 mt-2">{a.probable_cause}</p>

          {a.evidence.length > 0 && (
            <div className="mt-2 space-y-1">
              {a.evidence.map((e, i) => (
                <div key={i} className="text-[11px] text-muted flex gap-1.5">
                  <span className="text-accent2">▪</span>{e}
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setOpen(!open)} className="text-xs text-accent mt-2 hover:underline">
            {open ? "▾ Hide" : "▸ Show"} ranked action plan ({a.actions.length})
          </button>

          {open && (
            <div className="mt-2 space-y-2">
              {a.actions.map((act, i) => (
                <div key={i} className="bg-panel2 rounded-lg p-3 border border-border">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-slate-200">{act.action}</span>
                    <span className="pill bg-good/15 text-good shrink-0">conf {(act.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-[11px] text-muted flex-wrap">
                    {act.est_kwh_saved > 0 && <span>⚡ {act.est_kwh_saved} kWh</span>}
                    {act.est_litres_saved > 0 && <span>💧 {act.est_litres_saved} L</span>}
                    {act.est_rs_saved > 0 && <span className="text-good">₹ {act.est_rs_saved}</span>}
                    {act.est_co2_saved > 0 && <span className="text-good">🌱 {act.est_co2_saved} kg CO₂</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
