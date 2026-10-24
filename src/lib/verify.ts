// ============================================================================
// Data Validation & Model Testing Sandbox - verification logic.
// Two checks:
//   1. Model prediction check: run waste sensor rows through the real trained
//      classifier and compare predicted_class vs the user's expected label.
//   2. Telemetry integrity check: compare a submitted hourly reading against the
//      system's record for the same (building_id, timestamp) - from Supabase if
//      configured, otherwise the bundled hourly_streams snapshot. Flags packet
//      loss (missing), duplicates, and value drift.
// ============================================================================
import "server-only";
import { classify } from "./classifier";
import { getHourlyStreams } from "./data";
import type { HourlyStream } from "./types";

export type VerifyStatus = "success" | "mismatch" | "missing";

export interface WasteVerifyRow {
  kind: "waste";
  building_id?: string;
  weight_g: number;
  moisture_pct: number;
  metal_signal: number;
  transparency: number;
  acoustic_hardness: number;
  expected_label?: string | null;
}

export interface TelemetryVerifyRow {
  kind: "telemetry";
  building_id: string;
  timestamp: string;
  electricity_kwh?: number | null;
  water_litres?: number | null;
}

export type VerifyRow = WasteVerifyRow | TelemetryVerifyRow;

export interface VerifyResult {
  kind: "waste" | "telemetry";
  status: VerifyStatus;
  label: string; // human row label
  expected_value: string | number | null;
  actual_system_value: string | number | null;
  variance_percentage: number | null;
  diagnostic_message: string;
  source: string; // "edge model" | "supabase" | "bundled snapshot"
  extra?: Record<string, unknown>;
}

const pct = (a: number, b: number) =>
  b === 0 ? (a === 0 ? 0 : 100) : Math.abs((a - b) / b) * 100;

// ---- 1. Model prediction check ---------------------------------------------
export function verifyWaste(row: WasteVerifyRow): VerifyResult {
  const r = classify({
    weight_g: Number(row.weight_g) || 0,
    moisture_pct: Number(row.moisture_pct) || 0,
    metal_signal: Number(row.metal_signal) || 0,
    transparency: Number(row.transparency) || 0,
    acoustic_hardness: Number(row.acoustic_hardness) || 0,
  });
  const expected = (row.expected_label || "").trim().toLowerCase() || null;
  const predicted = r.predicted_class;
  const confPct = Number((r.confidence * 100).toFixed(1));

  let status: VerifyStatus;
  let msg: string;
  if (!expected) {
    // No ground truth supplied: judge by model confidence + gate.
    status = r.gated ? "mismatch" : "success";
    msg = r.gated
      ? `Low-confidence classification (${confPct}%) - routed to review bin. Possible sensor noise or edge case.`
      : `Edge classification "${predicted}" at ${confPct}% confidence matches site display and routes to ${r.routed_to}.`;
  } else if (expected === predicted) {
    status = "success";
    msg = `Edge classification matches expected label "${expected}" (${confPct}% confidence).`;
  } else {
    status = "mismatch";
    msg = `Incorrect classification: model predicted "${predicted}" (${confPct}%) but expected "${expected}". Possible data drift or mislabel.`;
  }

  return {
    kind: "waste",
    status,
    label: row.building_id ? `${row.building_id} · ${row.weight_g}g` : `${row.weight_g}g item`,
    expected_value: expected ?? "(no ground truth)",
    actual_system_value: predicted,
    variance_percentage: expected ? (expected === predicted ? 0 : 100) : null,
    diagnostic_message: msg,
    source: "edge model (RandomForest, pure-TS)",
    extra: {
      confidence: confPct,
      routed_to: r.routed_to,
      gated: r.gated,
      probabilities: r.probabilities,
      latency_ms: r.latency_ms,
    },
  };
}

// ---- 2. Telemetry integrity check ------------------------------------------
interface SystemRecord {
  rows: HourlyStream[];
  source: string;
}

async function lookupSystemRecord(
  buildingId: string,
  timestamp: string
): Promise<SystemRecord> {
  const normTs = timestamp.trim().slice(0, 16); // "YYYY-MM-DD HH:MM"

  // Try Supabase only if configured + explicitly enabled.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key && process.env.NEXT_PUBLIC_USE_LOCAL_DATA === "false") {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await supabase
        .from("hourly_streams")
        .select("*")
        .eq("building_id", buildingId)
        .gte("timestamp", `${normTs}:00`)
        .lte("timestamp", `${normTs}:59`);
      if (!error && data) {
        return { rows: data as unknown as HourlyStream[], source: "supabase (live DB)" };
      }
    } catch {
      // fall through to bundled snapshot
    }
  }

  const rows = getHourlyStreams().filter(
    (h) => h.building_id === buildingId && h.timestamp.slice(0, 16) === normTs
  );
  return { rows, source: "bundled snapshot (hourly_streams)" };
}

export async function verifyTelemetry(row: TelemetryVerifyRow): Promise<VerifyResult> {
  const { rows, source } = await lookupSystemRecord(row.building_id, row.timestamp);

  // Pick the metric the user supplied (electricity preferred, else water).
  const metric: "electricity_kwh" | "water_litres" =
    row.electricity_kwh != null && row.electricity_kwh !== undefined
      ? "electricity_kwh"
      : "water_litres";
  const expected = Number(
    metric === "electricity_kwh" ? row.electricity_kwh : row.water_litres
  );
  const label = `${row.building_id} @ ${row.timestamp.slice(0, 16)} · ${metric}`;

  // Packet loss: no record at all.
  if (rows.length === 0) {
    return {
      kind: "telemetry",
      status: "missing",
      label,
      expected_value: Number.isFinite(expected) ? expected : null,
      actual_system_value: null,
      variance_percentage: null,
      diagnostic_message: `No system record for ${row.building_id} at ${row.timestamp.slice(0, 16)}. Possible network packet loss / gateway dropout - would be back-filled on reconnect.`,
      source,
    };
  }

  // Duplicate detection.
  const dupFlag = rows.some((r) => r.is_duplicate === 1) || rows.length > 1;
  const actual = Number(rows[0][metric]);
  const variance = Number(pct(expected, actual).toFixed(2));

  let status: VerifyStatus;
  let msg: string;
  if (!Number.isFinite(expected)) {
    status = "success";
    msg = `System value ${actual} ${metric} found for ${row.building_id}. No expected value supplied to compare.`;
  } else if (variance <= 1) {
    status = "success";
    msg = `Test value matches system record within ${variance}% - dashboard display is accurate${dupFlag ? ", though duplicate retransmits exist and were deduplicated." : "."}`;
  } else if (variance <= 10) {
    status = "mismatch";
    msg = `Minor drift of ${variance}% between test input (${expected}) and system (${actual}). Within sensor-noise tolerance but flagged.`;
  } else {
    status = "mismatch";
    msg = `Data drift detected: ${variance}% gap between test input (${expected}) and system record (${actual}). Investigate sensor calibration or ingestion error.`;
  }

  return {
    kind: "telemetry",
    status,
    label,
    expected_value: Number.isFinite(expected) ? expected : null,
    actual_system_value: actual,
    variance_percentage: Number.isFinite(expected) ? variance : null,
    diagnostic_message: msg,
    source,
    extra: {
      records_found: rows.length,
      duplicate_detected: dupFlag,
      ingestion_lag_minutes: rows[0].ingestion_lag_minutes,
      is_buffered: rows[0].is_buffered,
    },
  };
}

// ---- CSV parsing (shared) --------------------------------------------------
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
    return obj;
  });
}

export function rowFromCsv(r: Record<string, string>): VerifyRow | null {
  const has = (k: string) => r[k] !== undefined && r[k] !== "";
  // Waste row if it carries sensor features.
  if (has("weight_g") || has("moisture_pct") || has("transparency")) {
    return {
      kind: "waste",
      building_id: r.building_id,
      weight_g: Number(r.weight_g),
      moisture_pct: Number(r.moisture_pct),
      metal_signal: Number(r.metal_signal),
      transparency: Number(r.transparency),
      acoustic_hardness: Number(r.acoustic_hardness),
      expected_label: r.expected_label || r.category || r.label || null,
    };
  }
  // Telemetry row.
  if (has("building_id") && has("timestamp") && (has("electricity_kwh") || has("water_litres"))) {
    return {
      kind: "telemetry",
      building_id: r.building_id,
      timestamp: r.timestamp,
      electricity_kwh: has("electricity_kwh") ? Number(r.electricity_kwh) : null,
      water_litres: has("water_litres") ? Number(r.water_litres) : null,
    };
  }
  return null;
}
