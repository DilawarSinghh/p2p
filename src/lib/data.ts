// ============================================================================
// Server-side data access layer.
// Reads the bundled JSON datasets from disk (works offline, Vercel-friendly).
// Each dataset is read once and cached in module scope.
// When Supabase is configured and NEXT_PUBLIC_USE_LOCAL_DATA=false, the same
// shapes can be served from the DB (see lib/supabase for the client).
// ============================================================================
import "server-only";
import fs from "node:fs";
import path from "node:path";
import type {
  Building,
  CalendarDay,
  DailySummary,
  HourlyStream,
  ManualLog,
  WasteEvent,
  ModelMetrics,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "src", "data", "datasets");
const MODEL_DIR = path.join(process.cwd(), "src", "data", "model");

const cache = new Map<string, unknown>();

function read<T>(file: string, dir = DATA_DIR): T {
  if (cache.has(file)) return cache.get(file) as T;
  const raw = fs.readFileSync(path.join(dir, file), "utf-8");
  const parsed = JSON.parse(raw) as T;
  cache.set(file, parsed);
  return parsed;
}

export const getBuildings = () => read<Building[]>("buildings.json");
export const getCalendar = () => read<CalendarDay[]>("calendar.json");
export const getDailySummary = () => read<DailySummary[]>("daily_summary.json");
export const getHourlyStreams = () => read<HourlyStream[]>("hourly_streams.json");
export const getManualLogs = () => read<ManualLog[]>("manual_logs.json");
export const getWasteTrain = () => read<WasteEvent[]>("waste_events_train.json");
export const getWasteTest = () => read<WasteEvent[]>("waste_events_test.json");
export const getModelMetrics = () =>
  read<ModelMetrics>("metrics.json", MODEL_DIR);

// ---- Convenience aggregations ----------------------------------------------

export function getBuildingMap(): Record<string, Building> {
  const m: Record<string, Building> = {};
  for (const b of getBuildings()) m[b.building_id] = b;
  return m;
}

export function dailyForBuilding(buildingId: string): DailySummary[] {
  return getDailySummary()
    .filter((d) => d.building_id === buildingId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function hourlyForBuilding(buildingId: string): HourlyStream[] {
  return getHourlyStreams()
    .filter((h) => h.building_id === buildingId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function calendarByDate(): Record<string, CalendarDay> {
  const m: Record<string, CalendarDay> = {};
  for (const c of getCalendar()) m[c.date] = c;
  return m;
}
