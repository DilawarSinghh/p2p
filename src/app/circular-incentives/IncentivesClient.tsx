"use client";
import { useState } from "react";
import { Card, Stat, Bar } from "@/components/ui";
import { SimpleBar } from "@/components/charts";
import type { BuildingScore, CampusImpact } from "@/lib/gamification";

const scoreColor = (s: number) =>
  s >= 70 ? "#4ade80" : s >= 55 ? "#2dd4bf" : s >= 40 ? "#fbbf24" : "#f87171";

const medal = (rank: number) =>
  rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

export default function IncentivesClient({
  scores,
  impact,
}: {
  scores: BuildingScore[];
  impact: CampusImpact;
}) {
  const [metric, setMetric] = useState<"green_score" | "recycling_rate_pct" | "kwh_per_capita">(
    "green_score"
  );

  const totalCredits = scores.reduce((s, b) => s + b.green_credits, 0);
  const earners = scores.filter((b) => b.earns_credits).length;
  const avgContam =
    scores.reduce((s, b) => s + b.avg_contamination_pct, 0) / (scores.length || 1);

  // Leaderboard ordering follows the selected metric.
  const ranked = [...scores].sort((a, b) =>
    metric === "kwh_per_capita"
      ? a[metric] - b[metric] // lower per-capita is better
      : b[metric] - a[metric]
  );

  const barData = ranked.map((b) => ({
    name: b.building_id,
    value:
      metric === "kwh_per_capita"
        ? b.kwh_per_capita
        : metric === "recycling_rate_pct"
          ? b.recycling_rate_pct
          : b.green_score,
  }));

  return (
    <div className="space-y-4">
      {/* Campus-wide impact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Diversion Rate"
          value={`${impact.diversion_rate_pct}%`}
          sub="recycled + composted"
          tone="good"
        />
        <Stat
          label="Green Credits Issued"
          value={totalCredits.toLocaleString()}
          sub={`${earners}/${scores.length} buildings earning`}
          tone="accent"
        />
        <Stat
          label="Compost Yield"
          value={`${impact.total_compost_yield_kg.toLocaleString()} kg`}
          sub={`from ${impact.total_composted_kg.toLocaleString()} kg wet organic`}
          tone="good"
        />
        <Stat
          label="Solar CO₂ Offset"
          value={`${impact.solar_offset_co2_kg.toLocaleString()} kg`}
          sub={`${impact.total_solar_kwh.toLocaleString()} kWh clean`}
          tone="good"
        />
      </div>

      {/* Week-over-week nudge signal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat
          label="Landfill WoW"
          value={`${impact.landfill_wow_change_pct > 0 ? "+" : ""}${impact.landfill_wow_change_pct}%`}
          sub="last 7d vs prior 7d"
          tone={impact.landfill_wow_change_pct <= 0 ? "good" : "danger"}
        />
        <Stat
          label="Peak kWh WoW"
          value={`${impact.peak_kwh_wow_change_pct > 0 ? "+" : ""}${impact.peak_kwh_wow_change_pct}%`}
          sub="last 7d vs prior 7d"
          tone={impact.peak_kwh_wow_change_pct <= 0 ? "good" : "warn"}
        />
        <Stat
          label="Avg Contamination"
          value={`${avgContam.toFixed(1)}%`}
          sub={`credit gate < 8%`}
          tone={avgContam < 8 ? "good" : "warn"}
        />
      </div>

      <Card
        title="Green-Score Leaderboard"
        right={
          <div className="flex gap-1.5">
            {(
              [
                ["green_score", "Green Score"],
                ["recycling_rate_pct", "Recycling %"],
                ["kwh_per_capita", "kWh / capita"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setMetric(k)}
                className={`btn text-xs ${metric === k ? "btn-accent" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <div className="mb-4">
          <SimpleBar
            data={barData}
            dataKey="value"
            colorByCell={(row) =>
              metric === "green_score"
                ? scoreColor(row.value as number)
                : metric === "kwh_per_capita"
                  ? "#38bdf8"
                  : "#4ade80"
            }
            height={220}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted text-[11px] uppercase tracking-wide">
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Building</th>
                <th className="py-2 pr-3">Green Score</th>
                <th className="py-2 pr-3">Recycling</th>
                <th className="py-2 pr-3">Solar Self</th>
                <th className="py-2 pr-3">kWh/capita</th>
                <th className="py-2 pr-3">Contam.</th>
                <th className="py-2 pr-3">Credits</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((b) => (
                <tr key={b.building_id} className="border-t border-border">
                  <td className="py-2 pr-3 font-semibold">{medal(b.rank)}</td>
                  <td className="py-2 pr-3">
                    <div className="text-slate-200">{b.building_name}</div>
                    <div className="text-[10px] text-muted">
                      {b.building_id} · {b.building_type}
                    </div>
                  </td>
                  <td className="py-2 pr-3 w-32">
                    <div
                      className="font-semibold"
                      style={{ color: scoreColor(b.green_score) }}
                    >
                      {b.green_score}
                    </div>
                    <Bar pct={b.green_score} color={scoreColor(b.green_score)} />
                  </td>
                  <td className="py-2 pr-3">{b.recycling_rate_pct}%</td>
                  <td className="py-2 pr-3">{b.solar_self_sufficiency_pct}%</td>
                  <td className="py-2 pr-3">{b.kwh_per_capita}</td>
                  <td
                    className={`py-2 pr-3 ${b.avg_contamination_pct < 8 ? "text-good" : "text-warn"}`}
                  >
                    {b.avg_contamination_pct}%
                  </td>
                  <td className="py-2 pr-3">
                    {b.earns_credits ? (
                      <span className="pill bg-good/15 text-good">
                        ♻ {b.green_credits}
                      </span>
                    ) : (
                      <span className="pill bg-panel2 text-muted">gated</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="How the Incentive Loop Works">
          <ol className="space-y-2.5 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="text-accent font-semibold">1.</span>
              <span>
                <span className="text-slate-100">Measure.</span> Each building gets a
                0–100 Green Score blending recycling rate (35%), solar
                self-sufficiency (20%), low contamination (25%) and low per-capita
                energy (20%) — normalized so blocks of different sizes compete fairly.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-semibold">2.</span>
              <span>
                <span className="text-slate-100">Reward.</span> Green Credits are issued
                only when contamination stays below 8% <em>and</em> recycling clears
                55%. This gate stops a building from &ldquo;gaming&rdquo; the score by
                dumping mixed waste into recycling bins to inflate volume.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-semibold">3.</span>
              <span>
                <span className="text-slate-100">Compare.</span> A public leaderboard
                and role-scoped dashboards (wardens, students) create visible social
                comparison — the behavioural nudge.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-semibold">4.</span>
              <span>
                <span className="text-slate-100">Close the loop.</span> Credits convert
                to budget for the building&rsquo;s own sustainability spend, tying the
                behavioural signal to an economic one.
              </span>
            </li>
          </ol>
        </Card>

        <Card title="Measuring Impact (success metric)">
          <p className="text-sm text-slate-300">
            The program is judged on movement, not absolute level, so every building
            can win regardless of starting point:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="text-accent2">▪</span>
              <span>
                <span className="text-slate-100">Primary KPI:</span> week-over-week
                landfill-per-capita reduction. Current:{" "}
                <span
                  className={
                    impact.landfill_wow_change_pct <= 0 ? "text-good" : "text-danger"
                  }
                >
                  {impact.landfill_wow_change_pct > 0 ? "+" : ""}
                  {impact.landfill_wow_change_pct}%
                </span>
                .
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent2">▪</span>
              <span>
                <span className="text-slate-100">Secondary KPI:</span> peak kWh
                flattening (demand-shift). Current:{" "}
                <span
                  className={
                    impact.peak_kwh_wow_change_pct <= 0 ? "text-good" : "text-warn"
                  }
                >
                  {impact.peak_kwh_wow_change_pct > 0 ? "+" : ""}
                  {impact.peak_kwh_wow_change_pct}%
                </span>
                .
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent2">▪</span>
              <span>
                <span className="text-slate-100">Integrity KPI:</span> contamination %
                must fall alongside recycling % — if recycling rises while
                contamination also rises, the gain is discounted as gaming.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent2">▪</span>
              <span>
                <span className="text-slate-100">Attribution:</span> compare
                credit-earning buildings against a holdout control block to isolate the
                nudge effect from seasonal drift.
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
