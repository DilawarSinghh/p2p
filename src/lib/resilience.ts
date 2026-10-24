import "server-only";
import { getWasteTrain, getHourlyStreams, getManualLogs, getCalendar } from "./data";

// ---- Failure Mode 1: Sensor drift / fouling (B07 Food Court) ----------------
// Detect slow upward baseline creep in moisture & downward in transparency for
// the food court bins (residue coating optical/dielectric sensors over time).
export function sensorDriftSignal() {
  const events = getWasteTrain()
    .filter((e) => e.building_id === "B07")
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  // rolling baseline of transparency for items the model thinks are opaque
  const half = Math.floor(events.length / 2);
  const early = events.slice(0, half);
  const late = events.slice(half);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
  const earlyTrans = mean(early.map((e) => e.transparency));
  const lateTrans = mean(late.map((e) => e.transparency));
  const earlyMoist = mean(early.map((e) => e.moisture_pct));
  const lateMoist = mean(late.map((e) => e.moisture_pct));
  return {
    building: "B07",
    early_transparency: Number(earlyTrans.toFixed(3)),
    late_transparency: Number(lateTrans.toFixed(3)),
    transparency_drift_pct: Number((((lateTrans - earlyTrans) / (earlyTrans || 1)) * 100).toFixed(1)),
    early_moisture: Number(earlyMoist.toFixed(1)),
    late_moisture: Number(lateMoist.toFixed(1)),
    moisture_drift_pct: Number((((lateMoist - earlyMoist) / (earlyMoist || 1)) * 100).toFixed(1)),
    samples: events.length,
  };
}

// ---- Failure Mode 2: Adversarial gaming of smart-bin credits ----------------
// Flag events that look like "credit farming": high weight but physically
// inconsistent (very hard + opaque + dry = likely a stone/bottle dropped to
// inflate weight-based credit). Rate-limit per bin.
export function gamingSignals() {
  const events = getWasteTrain();
  const suspicious = events.filter(
    (e) =>
      e.weight_g > 800 &&
      e.acoustic_hardness > 0.7 &&
      e.moisture_pct < 10 &&
      e.transparency < 0.15 &&
      e.metal_signal < 5
  );
  // bins with many heavy-dense drops in the data (potential farming hotspots)
  const byBin: Record<string, number> = {};
  for (const e of suspicious) byBin[e.bin_id] = (byBin[e.bin_id] ?? 0) + 1;
  const hotspots = Object.entries(byBin)
    .map(([bin_id, count]) => ({ bin_id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  return { flagged: suspicious.length, total: events.length, hotspots };
}

// ---- Failure Mode 3: Concept drift across semester phases -------------------
// Show how waste/footfall regimes shift between semester_break / working / exam
// using calendar.day_type; the model does contextual regime switching.
export function conceptDriftSignal() {
  const cal = getCalendar();
  const dayType: Record<string, string> = {};
  for (const c of cal) dayType[c.date] = c.day_type;
  const events = getWasteTrain();
  const byRegime: Record<string, { n: number; weight: number }> = {};
  for (const e of events) {
    const dt = dayType[e.timestamp.slice(0, 10)] ?? "unknown";
    const r = (byRegime[dt] ??= { n: 0, weight: 0 });
    r.n++;
    r.weight += e.weight_g;
  }
  return Object.entries(byRegime)
    .filter(([k]) => k !== "unknown")
    .map(([regime, v]) => ({
      regime,
      events: v.n,
      avg_weight_g: Number((v.weight / v.n).toFixed(0)),
    }))
    .sort((a, b) => b.events - a.events);
}

export function dataScaleStats() {
  return {
    hourly: getHourlyStreams().length,
    manual: getManualLogs().length,
    waste: getWasteTrain().length,
  };
}
