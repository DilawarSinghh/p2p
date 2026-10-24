// ============================================================================
// Circular-economy + gamification engine.
// Green Score, leaderboard (per-occupant & per-sqm), Green Credits,
// contamination penalties, composting loop, and impact metrics.
// ============================================================================
import "server-only";
import { getDailySummary, getBuildingMap } from "./data";
import {
  compostYield,
  co2FromKwh,
  CONTAMINATION_CREDIT_THRESHOLD_PCT,
} from "./constants";

export interface BuildingScore {
  building_id: string;
  building_name: string;
  building_type: string;
  green_score: number; // 0-100
  kwh_per_capita: number;
  kwh_per_sqm: number;
  solar_self_sufficiency_pct: number;
  recycling_rate_pct: number;
  compost_yield_kg: number;
  avg_contamination_pct: number;
  landfill_kg: number;
  green_credits: number;
  earns_credits: boolean;
  rank: number;
}

export interface CampusImpact {
  total_landfill_kg: number;
  total_recycled_kg: number;
  total_composted_kg: number;
  total_compost_yield_kg: number;
  diversion_rate_pct: number;
  total_solar_kwh: number;
  total_grid_kwh: number;
  solar_offset_co2_kg: number;
  landfill_wow_change_pct: number; // week-over-week last vs prior
  peak_kwh_wow_change_pct: number;
}

function sum(xs: number[]) {
  return xs.reduce((s, x) => s + x, 0);
}
function avg(xs: number[]) {
  return xs.length ? sum(xs) / xs.length : 0;
}

export function buildingScores(): BuildingScore[] {
  const daily = getDailySummary();
  const bmap = getBuildingMap();
  const byBuilding: Record<string, typeof daily> = {};
  for (const r of daily) (byBuilding[r.building_id] ??= []).push(r);

  const scores: BuildingScore[] = [];
  for (const [bid, rows] of Object.entries(byBuilding)) {
    const b = bmap[bid];
    const elec = sum(rows.map((r) => r.electricity_kwh));
    const solar = sum(rows.map((r) => r.solar_generation_kwh));
    const occ = avg(rows.map((r) => r.occupancy_avg)) || 1;
    const recycled = sum(rows.map((r) => r.recycled_kg));
    const composted = sum(rows.map((r) => r.composted_kg));
    const landfill = sum(rows.map((r) => r.landfill_kg));
    const dry = sum(rows.map((r) => r.dry_recyclable_kg));
    const wet = sum(rows.map((r) => r.wet_organic_kg));
    const contamination = avg(rows.map((r) => r.contamination_pct));
    const totalWaste = recycled + composted + landfill || 1;

    const kwhPerCapita = elec / occ;
    const kwhPerSqm = elec / (b?.area_sqm || 1);
    const solarSelf = elec > 0 ? Math.min(100, (solar / elec) * 100) : 0;
    const recyclingRate = ((recycled + composted) / totalWaste) * 100;

    // Green score: reward recycling + solar, penalize contamination + per-capita load.
    // Normalized heuristically into 0-100.
    const score =
      0.35 * Math.min(100, recyclingRate) +
      0.2 * solarSelf +
      0.25 * Math.max(0, 100 - contamination * 6) +
      0.2 * Math.max(0, 100 - kwhPerCapita * 0.15);

    const earns =
      contamination < CONTAMINATION_CREDIT_THRESHOLD_PCT && recyclingRate > 55;
    const credits = earns
      ? Math.round((recyclingRate - 50) * 2 + (CONTAMINATION_CREDIT_THRESHOLD_PCT - contamination) * 10)
      : 0;

    scores.push({
      building_id: bid,
      building_name: b?.building_name ?? bid,
      building_type: b?.building_type ?? "",
      green_score: Number(score.toFixed(1)),
      kwh_per_capita: Number(kwhPerCapita.toFixed(2)),
      kwh_per_sqm: Number(kwhPerSqm.toFixed(2)),
      solar_self_sufficiency_pct: Number(solarSelf.toFixed(1)),
      recycling_rate_pct: Number(recyclingRate.toFixed(1)),
      compost_yield_kg: Number(compostYield(composted).toFixed(1)),
      avg_contamination_pct: Number(contamination.toFixed(1)),
      landfill_kg: Number(landfill.toFixed(1)),
      green_credits: Math.max(0, credits),
      earns_credits: earns,
      rank: 0,
    });
  }
  scores.sort((a, b) => b.green_score - a.green_score);
  scores.forEach((s, i) => (s.rank = i + 1));
  return scores;
}

export function campusImpact(): CampusImpact {
  const daily = getDailySummary();
  const landfill = sum(daily.map((r) => r.landfill_kg));
  const recycled = sum(daily.map((r) => r.recycled_kg));
  const composted = sum(daily.map((r) => r.composted_kg));
  const solar = sum(daily.map((r) => r.solar_generation_kwh));
  const grid = sum(daily.map((r) => r.electricity_kwh));
  const totalWaste = landfill + recycled + composted || 1;

  // Week-over-week: compare last 7 days vs prior 7 days (by date).
  const dates = [...new Set(daily.map((r) => r.date))].sort();
  const last7 = new Set(dates.slice(-7));
  const prior7 = new Set(dates.slice(-14, -7));
  const landfillLast = sum(daily.filter((r) => last7.has(r.date)).map((r) => r.landfill_kg));
  const landfillPrior = sum(daily.filter((r) => prior7.has(r.date)).map((r) => r.landfill_kg));
  const kwhLast = sum(daily.filter((r) => last7.has(r.date)).map((r) => r.electricity_kwh));
  const kwhPrior = sum(daily.filter((r) => prior7.has(r.date)).map((r) => r.electricity_kwh));

  return {
    total_landfill_kg: Number(landfill.toFixed(0)),
    total_recycled_kg: Number(recycled.toFixed(0)),
    total_composted_kg: Number(composted.toFixed(0)),
    total_compost_yield_kg: Number(compostYield(composted).toFixed(0)),
    diversion_rate_pct: Number((((recycled + composted) / totalWaste) * 100).toFixed(1)),
    total_solar_kwh: Number(solar.toFixed(0)),
    total_grid_kwh: Number(grid.toFixed(0)),
    solar_offset_co2_kg: Number(co2FromKwh(solar).toFixed(0)),
    landfill_wow_change_pct: Number(
      (((landfillLast - landfillPrior) / (landfillPrior || 1)) * 100).toFixed(1)
    ),
    peak_kwh_wow_change_pct: Number(
      (((kwhLast - kwhPrior) / (kwhPrior || 1)) * 100).toFixed(1)
    ),
  };
}
