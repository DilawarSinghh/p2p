import "server-only";
import {
  getHourlyStreams,
  getManualLogs,
  getWasteTrain,
  getBuildings,
} from "./data";
import { BUFFER_THRESHOLD_MIN } from "./constants";

export function fusionOverview() {
  const hourly = getHourlyStreams();
  const logs = getManualLogs();
  const waste = getWasteTrain();
  const buildings = getBuildings();

  // Lag distribution buckets
  const buckets = [
    { label: "≤70m (normal)", lo: 0, hi: 70 },
    { label: "70–120m", lo: 70, hi: 120 },
    { label: "120–240m", lo: 120, hi: 240 },
    { label: "240m+ (buffered)", lo: 240, hi: Infinity },
  ].map((b) => ({
    name: b.label,
    count: hourly.filter((h) => h.ingestion_lag_minutes >= b.lo && h.ingestion_lag_minutes < b.hi).length,
  }));

  const buffered = hourly.filter((h) => h.is_buffered);
  const duplicates = hourly.filter((h) => h.is_duplicate);

  // Per-building buffered counts (which buildings dropped out)
  const perBuilding = buildings.map((b) => ({
    building_id: b.building_id,
    name: b.building_name,
    total: hourly.filter((h) => h.building_id === b.building_id).length,
    buffered: buffered.filter((h) => h.building_id === b.building_id).length,
    duplicates: duplicates.filter((h) => h.building_id === b.building_id).length,
    avg_lag: Number(
      (
        hourly.filter((h) => h.building_id === b.building_id).reduce((s, h) => s + h.ingestion_lag_minutes, 0) /
        (hourly.filter((h) => h.building_id === b.building_id).length || 1)
      ).toFixed(1)
    ),
  }));

  // Source cadence summary (async streams)
  const sources = [
    { source: "hourly_streams (IoT meters)", cadence: "hourly", rows: hourly.length, note: "async; received_at ≠ timestamp" },
    { source: "waste_events (smart-bin)", cadence: "event-driven", rows: waste.length, note: "irregular disposal triggers" },
    { source: "manual_logs (human)", cadence: "shift-based", rows: logs.length, note: "dirty aliases + mixed units" },
  ];

  return {
    totals: {
      hourly: hourly.length,
      buffered: buffered.length,
      duplicates: duplicates.length,
      buffer_threshold: BUFFER_THRESHOLD_MIN,
    },
    buckets,
    perBuilding,
    sources,
  };
}

/** Build a deterministic "offline buffer -> burst flush" timeline for a building. */
export function bufferTimeline(buildingId: string) {
  const hourly = getHourlyStreams()
    .filter((h) => h.building_id === buildingId)
    .sort((a, b) => a.received_at.localeCompare(b.received_at));

  // Find a window with buffered packets (burst of same received_at).
  const byReceived: Record<string, typeof hourly> = {};
  for (const h of hourly) (byReceived[h.received_at] ??= []).push(h);

  const bursts = Object.entries(byReceived)
    .filter(([, arr]) => arr.length > 1)
    .map(([received_at, arr]) => ({
      received_at,
      packets: arr.length,
      captured_hours: arr.map((h) => h.timestamp.slice(5, 16)).sort(),
      max_lag: Math.max(...arr.map((h) => h.ingestion_lag_minutes)),
      buffered: arr.filter((h) => h.is_buffered).length,
      duplicates: arr.filter((h) => h.is_duplicate).length,
    }))
    .sort((a, b) => b.max_lag - a.max_lag)
    .slice(0, 8);

  return bursts;
}

export const BUILDINGS_WITH_BUFFER = () => {
  const over = fusionOverview();
  return over.perBuilding
    .filter((b) => b.buffered > 0)
    .sort((a, b) => b.buffered - a.buffered);
};
