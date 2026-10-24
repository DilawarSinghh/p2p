import "server-only";
import {
  getDailySummary,
  getBuildings,
  getHourlyStreams,
  getManualLogs,
  getWasteTrain,
} from "./data";
import { co2FromKwh, rsFromKwh } from "./constants";

export function campusOverview() {
  const daily = getDailySummary();
  const buildings = getBuildings();
  const hourly = getHourlyStreams();
  const logs = getManualLogs();
  const train = getWasteTrain();

  const grid = sum(daily.map((r) => r.electricity_kwh));
  const solar = sum(daily.map((r) => r.solar_generation_kwh));
  const water = sum(daily.map((r) => r.water_litres));
  const landfill = sum(daily.map((r) => r.landfill_kg));
  const recycled = sum(daily.map((r) => r.recycled_kg));
  const composted = sum(daily.map((r) => r.composted_kg));
  const totalWaste = landfill + recycled + composted || 1;

  const buffered = hourly.filter((h) => h.is_buffered).length;
  const dups = hourly.filter((h) => h.is_duplicate).length;

  // daily campus-wide series for the trend chart
  const byDate: Record<string, { elec: number; water: number; solar: number; landfill: number }> = {};
  for (const r of daily) {
    const d = (byDate[r.date] ??= { elec: 0, water: 0, solar: 0, landfill: 0 });
    d.elec += r.electricity_kwh;
    d.water += r.water_litres;
    d.solar += r.solar_generation_kwh;
    d.landfill += r.landfill_kg;
  }
  const series = Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date: date.slice(5),
      electricity: Math.round(v.elec),
      water: Math.round(v.water / 1000),
      solar: Math.round(v.solar),
      landfill: Math.round(v.landfill),
    }));

  // per-building snapshot
  const perBuilding = buildings.map((b) => {
    const rows = daily.filter((r) => r.building_id === b.building_id);
    return {
      building_id: b.building_id,
      name: b.building_name,
      type: b.building_type,
      electricity: Math.round(sum(rows.map((r) => r.electricity_kwh))),
      solar: Math.round(sum(rows.map((r) => r.solar_generation_kwh))),
      landfill: Math.round(sum(rows.map((r) => r.landfill_kg))),
      contamination: Number(avg(rows.map((r) => r.contamination_pct)).toFixed(1)),
      has_solar: b.has_solar,
      has_composter: b.has_composter,
    };
  });

  return {
    kpis: {
      grid_kwh: Math.round(grid),
      solar_kwh: Math.round(solar),
      water_kl: Math.round(water / 1000),
      landfill_kg: Math.round(landfill),
      diversion_pct: Number((((recycled + composted) / totalWaste) * 100).toFixed(1)),
      co2_tonnes: Number((co2FromKwh(grid) / 1000).toFixed(1)),
      energy_cost_rs: Math.round(rsFromKwh(grid)),
      solar_savings_rs: Math.round(rsFromKwh(solar)),
    },
    data_health: {
      hourly_rows: hourly.length,
      buffered,
      duplicates: dups,
      manual_logs: logs.length,
      train_events: train.length,
      buildings: buildings.length,
    },
    series,
    perBuilding,
  };
}

function sum(xs: number[]) {
  return xs.reduce((s, x) => s + x, 0);
}
function avg(xs: number[]) {
  return xs.length ? sum(xs) / xs.length : 0;
}
