"use client";
import { useState } from "react";
import { Card, Stat, Bar } from "@/components/ui";
import { SimpleBar } from "@/components/charts";
import type { BuildingScore, CampusImpact } from "@/lib/gamification";

export default function CircularClient({
  scores,
  impact,
}: {
  scores: BuildingScore[];
  impact: CampusImpact;
}) {
  const [norm, setNorm] = useState<"green_score" | "kwh_per_capita" | "kwh_per_sqm">("green_score");

  const ranked = [...scores].sort((a, b) =>
    norm === "green_score" ? b.green_score - a.green_score : a[norm] - b[norm]
  );

  return (
    <div className="space-y-4">
      {/* Campus impact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Diversion Rate" value={`${impact.diversion_rate_pct}%`} sub="recycled + composted" tone="good" />
        <Stat label="Compost Yield" value={`${impact.total_compost_yield_kg.toLocaleString()} kg`} sub={`from ${impact.total_composted_kg.toLocaleString()} kg organic (4:1)`} tone="accent" />
        <Stat label="Solar CO₂ Offset" value={`${impact.solar_offset_co2_kg.toLocaleString()} kg`} sub={`${impact.total_solar_kwh.toLocaleString()} kWh @ 0.70`} tone="good" />
        <Stat label="Landfill (kg)" value={impact.total_landfill_kg.toLocaleString()} tone="danger" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Week-over-Week Impact (measurable loop)">
          <div className="grid grid-cols-2 gap-3">
            <div className="stat">
              <div className="label">Landfill WoW</div>
              <div className={`text-2xl font-bold mt-1 ${impact.landfill_wow_change_pct <= 0 ? "text-good" : "text-danger"}`}>
                {impact.landfill_wow_change_pct > 0 ? "+" : ""}{impact.landfill_wow_change_pct}%
              </div>
              <div className="text-[11px] text-muted">last 7d vs prior 7d</div>
            </div>
            <div className="stat">
              <div className="label">Peak kWh WoW</div>
              <div className={`text-2xl font-bold mt-1 ${impact.peak_kwh_wow_change_pct <= 0 ? "text-good" : "text-danger"}`}>
                {impact.peak_kwh_wow_change_pct > 0 ? "+" : ""}{impact.peak_kwh_wow_change_pct}%
              </div>
              <div className="text-[11px] text-muted">A/B longitudinal metric</div>
            </div>
          </div>
          <p className="text-[11px] text-muted mt-3">
            Impact is measured as week-over-week % change in landfill mass and peak electricity. Buildings that keep
            contamination &lt; 8% and per-capita kWh below baseline earn Green Credits.
          </p>
        </Card>

        <Card title="Green Score by Building">
          <SimpleBar
            data={scores.map((s) => ({ name: s.building_id, score: s.green_score }))}
            dataKey="score"
            colorByCell={(r) => (Number(r.score) > 55 ? "#4ade80" : Number(r.score) > 40 ? "#fbbf24" : "#f87171")}
          />
        </Card>
      </div>

      {/* Leaderboard */}
      <Card
        title="Green Leaderboard"
        right={
          <div className="flex gap-1">
            {[
              { k: "green_score", l: "Green Score" },
              { k: "kwh_per_capita", l: "kWh / occupant" },
              { k: "kwh_per_sqm", l: "kWh / m²" },
            ].map((o) => (
              <button key={o.k} className={`btn text-xs ${norm === o.k ? "btn-accent" : ""}`} onClick={() => setNorm(o.k as typeof norm)}>
                {o.l}
              </button>
            ))}
          </div>
        }
      >
        <div className="space-y-2">
          {ranked.map((s, i) => (
            <div key={s.building_id} className="flex items-center gap-3 bg-panel2 rounded-lg p-2.5 border border-border/50">
              <div className={`text-lg font-bold w-7 text-center ${i === 0 ? "text-warn" : i < 3 ? "text-slate-300" : "text-muted"}`}>
                {i + 1}
              </div>
              <div className="w-44">
                <div className="text-sm text-slate-200">{s.building_id} · {s.building_name}</div>
                <div className="text-[10px] text-muted capitalize">{s.building_type}</div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-muted">
                    {norm === "green_score" ? "Green Score" : norm === "kwh_per_capita" ? "kWh/occupant" : "kWh/m²"}
                  </span>
                  <span className="text-slate-200 font-semibold">
                    {norm === "green_score" ? s.green_score : norm === "kwh_per_capita" ? s.kwh_per_capita : s.kwh_per_sqm}
                  </span>
                </div>
                <Bar
                  pct={norm === "green_score" ? s.green_score : 100 - Math.min(100, (norm === "kwh_per_capita" ? s.kwh_per_capita : s.kwh_per_sqm * 10))}
                  color={s.green_score > 55 ? "#4ade80" : "#fbbf24"}
                />
              </div>
              <div className="flex gap-3 text-[11px] w-56 justify-end">
                <span className="text-muted">♲ {s.recycling_rate_pct}%</span>
                <span className={s.avg_contamination_pct >= 8 ? "text-warn" : "text-good"}>⚠ {s.avg_contamination_pct}%</span>
                {s.solar_self_sufficiency_pct > 0 && <span className="text-accent2">☀ {s.solar_self_sufficiency_pct}%</span>}
              </div>
              <div className="w-24 text-right">
                {s.earns_credits ? (
                  <span className="pill bg-good/15 text-good">+{s.green_credits} credits</span>
                ) : (
                  <span className="pill bg-danger/10 text-danger">no credits</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Nudge loop */}
      <Card title="Closed-Loop Nudge Mechanism">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="stat">
            <div className="text-accent font-semibold mb-1">① Earn</div>
            <p className="text-[12px] text-muted">
              Contamination &lt; 8% AND per-capita kWh below baseline → building accrues Campus Green Credits.
            </p>
          </div>
          <div className="stat">
            <div className="text-accent font-semibold mb-1">② Redeem</div>
            <p className="text-[12px] text-muted">
              Credits convert to mess discounts / extended common-room hours — a real economic incentive for occupants.
            </p>
          </div>
          <div className="stat">
            <div className="text-accent font-semibold mb-1">③ Measure</div>
            <p className="text-[12px] text-muted">
              A/B cohorts tracked by week-over-week landfill and peak-kWh reduction to prove the behavioural effect.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
