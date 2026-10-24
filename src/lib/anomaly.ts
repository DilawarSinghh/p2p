// ============================================================================
// Root-cause attribution engine.
// 1. Detect statistical anomalies (z-score) in daily_summary / hourly_streams.
// 2. Cross-reference the anomaly window against normalized manual_logs notes
//    and calendar events for the same building + date.
// 3. Emit a ranked, justified action recommendation with kWh/L/Rs/CO2 impact.
// ============================================================================
import "server-only";
import {
  getDailySummary,
  getManualLogs,
  calendarByDate,
  getBuildingMap,
  hourlyForBuilding,
} from "./data";
import {
  co2FromKwh,
  rsFromKwh,
  kwhFromWater,
  WATER_ENERGY_KWH_PER_1000L,
} from "./constants";
import type { ManualLog } from "./types";

export interface ActionStep {
  action: string;
  est_kwh_saved: number;
  est_litres_saved: number;
  est_rs_saved: number;
  est_co2_saved: number;
  confidence: number;
}

export interface Anomaly {
  id: string;
  building_id: string;
  building_name: string;
  date: string;
  metric: string;
  value: number;
  baseline: number;
  z_score: number;
  pct_deviation: number;
  direction: "spike" | "drop";
  probable_cause: string;
  evidence: string[];
  actions: ActionStep[];
  rank_score: number;
}

const METRICS: { key: keyof DailyRow; label: string }[] = [
  { key: "water_litres", label: "water draw" },
  { key: "electricity_kwh", label: "electricity load" },
  { key: "contamination_pct", label: "recycling contamination" },
  { key: "landfill_kg", label: "landfill output" },
];

type DailyRow = ReturnType<typeof getDailySummary>[number];

function stats(xs: number[]) {
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
  return { mean, sd: Math.sqrt(variance) || 1e-9 };
}

/** Find manual-log notes/readings for a building+date (±1 day window). */
function relatedLogs(buildingId: string, date: string): ManualLog[] {
  const logs = getManualLogs();
  return logs.filter((l) => {
    if (l.normalized_building_id !== buildingId) return false;
    const d = l.logged_at.slice(0, 10);
    return Math.abs(dayDiff(d, date)) <= 1;
  });
}

function dayDiff(a: string, b: string): number {
  return (
    (new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime()) /
    86400_000
  );
}

export function detectAnomalies(zThreshold = 2.5): Anomaly[] {
  const daily = getDailySummary();
  const cal = calendarByDate();
  const bmap = getBuildingMap();
  const out: Anomaly[] = [];

  // Group by building.
  const byBuilding: Record<string, DailyRow[]> = {};
  for (const r of daily) (byBuilding[r.building_id] ??= []).push(r);

  for (const [bid, rows] of Object.entries(byBuilding)) {
    rows.sort((a, b) => a.date.localeCompare(b.date));
    for (const { key, label } of METRICS) {
      const series = rows.map((r) => Number(r[key]) || 0);
      const { mean, sd } = stats(series);
      rows.forEach((r, i) => {
        const v = series[i];
        const z = (v - mean) / sd;
        if (Math.abs(z) < zThreshold) return;
        const direction = z > 0 ? "spike" : "drop";
        // Only spikes are actionable for consumption/contamination.
        if (direction === "drop" && key !== "landfill_kg") return;

        const logs = relatedLogs(bid, r.date);
        const noteLogs = logs.filter((l) => l.note);
        const calDay = cal[r.date];
        const evidence: string[] = [];
        if (calDay?.event) evidence.push(`Calendar: "${calDay.event}" (${calDay.day_type})`);
        for (const l of noteLogs.slice(0, 3))
          evidence.push(`${l.logger_role} log: "${l.note}"`);
        for (const l of logs.filter((l) => l.stream !== "note" && l.normalized_value != null).slice(0, 2))
          evidence.push(
            `${l.logger_role} recorded ${l.normalized_value?.toFixed(0)} ${l.normalized_unit} (${l.stream})`
          );

        const pct = (((v - mean) / (mean || 1)) * 100);
        const cause = buildCause(label, direction, bid, bmap[bid]?.building_name, r.date, pct, noteLogs, calDay?.event ?? null);
        const actions = buildActions(key as string, v, mean, bmap[bid]?.has_composter ?? 0);

        const rank = Math.abs(z) * (evidence.length + 1) * (Math.abs(pct) / 100 + 1);
        out.push({
          id: `${bid}-${r.date}-${key}`,
          building_id: bid,
          building_name: bmap[bid]?.building_name ?? bid,
          date: r.date,
          metric: label,
          value: Number(v.toFixed(1)),
          baseline: Number(mean.toFixed(1)),
          z_score: Number(z.toFixed(2)),
          pct_deviation: Number(pct.toFixed(1)),
          direction,
          probable_cause: cause,
          evidence,
          actions,
          rank_score: Number(rank.toFixed(2)),
        });
      });
    }
  }
  return out.sort((a, b) => b.rank_score - a.rank_score);
}

function buildCause(
  label: string,
  direction: string,
  bid: string,
  name: string | undefined,
  date: string,
  pct: number,
  noteLogs: ManualLog[],
  event: string | null
): string {
  const where = `${bid} ${name ?? ""}`.trim();
  const magnitude = `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;
  if (noteLogs.length) {
    return `${where} ${label} ${direction} of ${magnitude} on ${date} correlates with ${noteLogs[0].logger_role} note: "${noteLogs[0].note}".`;
  }
  if (event) {
    return `${where} ${label} ${direction} of ${magnitude} on ${date} linked to scheduled event: "${event}".`;
  }
  return `${where} ${label} ${direction} of ${magnitude} on ${date}; no operator note found - flagged for manual inspection.`;
}

function buildActions(
  key: string,
  value: number,
  baseline: number,
  hasComposter: number
): ActionStep[] {
  const excess = Math.max(0, value - baseline);
  const actions: ActionStep[] = [];
  if (key === "electricity_kwh") {
    const kwh = excess * 0.6;
    actions.push({
      action: "Audit HVAC setpoints & switch off idle lab/computer loads during off-peak hours.",
      est_kwh_saved: round(kwh),
      est_litres_saved: 0,
      est_rs_saved: round(rsFromKwh(kwh)),
      est_co2_saved: round(co2FromKwh(kwh)),
      confidence: 0.72,
    });
  } else if (key === "water_litres") {
    const litres = excess * 0.5;
    const kwh = kwhFromWater(litres);
    actions.push({
      action: "Dispatch plumbing check for stuck float valves / leaks; isolate the affected riser.",
      est_kwh_saved: round(kwh),
      est_litres_saved: round(litres),
      est_rs_saved: round(rsFromKwh(kwh)),
      est_co2_saved: round(co2FromKwh(kwh)),
      confidence: 0.78,
    });
  } else if (key === "contamination_pct") {
    actions.push({
      action: "Re-run segregation awareness nudge + station a volunteer at peak-hour bins for 48h.",
      est_kwh_saved: 0,
      est_litres_saved: 0,
      est_rs_saved: 0,
      est_co2_saved: 0,
      confidence: 0.65,
    });
  } else if (key === "landfill_kg") {
    const divert = excess * 0.7;
    actions.push({
      action: hasComposter
        ? "Route surplus wet-organic to on-site composter; verify segregation at source."
        : "Schedule extra recycler pickup and add a composting drop-off for this block.",
      est_kwh_saved: 0,
      est_litres_saved: 0,
      est_rs_saved: round(divert * 2),
      est_co2_saved: round(divert * 0.5),
      confidence: 0.6,
    });
  }
  return actions;
}

const round = (x: number) => Number(x.toFixed(1));

/** Hourly-level z-score anomalies for a building (used on the hourly view). */
export function hourlyAnomalies(buildingId: string, metric: "electricity_kwh" | "water_litres", z = 2.5) {
  const rows = hourlyForBuilding(buildingId).filter((r) => r.is_duplicate === 0);
  const series = rows.map((r) => r[metric] ?? 0);
  const { mean, sd } = stats(series);
  return rows
    .map((r, i) => ({ r, z: (series[i] - mean) / sd }))
    .filter((x) => Math.abs(x.z) >= z)
    .map((x) => ({
      timestamp: x.r.timestamp,
      value: x.r[metric],
      z: Number(x.z.toFixed(2)),
    }));
}

export const WATER_ENERGY_NOTE = `${WATER_ENERGY_KWH_PER_1000L} kWh/1000L`;
