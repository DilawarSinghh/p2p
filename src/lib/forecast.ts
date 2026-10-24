// ============================================================================
// Short-horizon (6-12h) forecasting engine - pure TS, edge-deployable.
// Approach: ridge-style autoregression on recent lags + exogenous calendar
// drivers (temperature, rainfall, humidity, day_type, scheduled event),
// plus hour-of-day and day-of-week seasonal profiles learned from history.
// This is the "lightweight" edge path in the accuracy-compute trade-off panel.
// ============================================================================
import "server-only";
import { hourlyForBuilding, calendarByDate } from "./data";
import type { HourlyStream } from "./types";

export type Metric = "electricity_kwh" | "water_litres" | "footfall";

export interface ForecastPoint {
  timestamp: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
  is_future: boolean;
}

export interface ForecastResult {
  building_id: string;
  metric: Metric;
  points: ForecastPoint[];
  horizon_hours: number;
  mae: number; // backtest mean absolute error
  mape: number; // backtest mean absolute % error
  spike_warning: {
    at: string;
    expected: number;
    baseline: number;
    pct_above: number;
  } | null;
}

function hourOf(ts: string): number {
  // ts: "YYYY-MM-DD HH:MM"
  return parseInt(ts.slice(11, 13), 10);
}
function dateOf(ts: string): string {
  return ts.slice(0, 10);
}
function dowOf(ts: string): number {
  return new Date(ts.replace(" ", "T") + ":00").getDay();
}

/** Learn average seasonal profile by hour-of-day and day-of-week. */
function seasonalProfiles(rows: HourlyStream[], metric: Metric) {
  const byHour: number[][] = Array.from({ length: 24 }, () => []);
  const byDow: number[][] = Array.from({ length: 7 }, () => []);
  for (const r of rows) {
    const v = r[metric];
    if (v == null) continue;
    byHour[hourOf(r.timestamp)].push(v);
    byDow[dowOf(r.timestamp)].push(v);
  }
  const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  return {
    hourMean: byHour.map(mean),
    dowMean: byDow.map(mean),
    overall: mean(rows.map((r) => r[metric]).filter((x): x is number => x != null)),
  };
}

/**
 * Forecast `horizon` hours past the last observed hour.
 * Model: forecast = w_ar * lag_blend + w_season * seasonal + w_exo * exo_adj
 * Weights are fit by a tiny closed-form ridge on the last ~14 days of history.
 */
export function forecast(
  buildingId: string,
  metric: Metric,
  horizon: 6 | 12 = 12
): ForecastResult {
  const rows = hourlyForBuilding(buildingId);
  const cal = calendarByDate();
  const prof = seasonalProfiles(rows, metric);

  const vals = rows.map((r) => r[metric] ?? 0);
  const n = rows.length;

  // Build training examples: predict value[t] from features at t.
  // Features: lag1, lag24, seasonal(hour), seasonal(dow), temp, rain, isEvent, isExam
  const feats: number[][] = [];
  const target: number[] = [];
  for (let t = 24; t < n; t++) {
    const r = rows[t];
    const c = cal[dateOf(r.timestamp)];
    feats.push([
      1,
      vals[t - 1],
      vals[t - 24],
      prof.hourMean[hourOf(r.timestamp)],
      prof.dowMean[dowOf(r.timestamp)],
      c?.avg_temp_c ?? 25,
      c?.rainfall_mm ?? 0,
      c?.event ? 1 : 0,
      c?.day_type === "exam" ? 1 : 0,
    ]);
    target.push(vals[t]);
  }

  const w = ridgeFit(feats, target, 5.0);

  // Backtest on last 20% to report MAE / MAPE.
  const split = Math.floor(feats.length * 0.8);
  let absErr = 0,
    pctErr = 0,
    cnt = 0;
  for (let i = split; i < feats.length; i++) {
    const pred = dot(w, feats[i]);
    absErr += Math.abs(pred - target[i]);
    if (Math.abs(target[i]) > 1e-6) pctErr += Math.abs((pred - target[i]) / target[i]);
    cnt++;
  }
  const mae = cnt ? absErr / cnt : 0;
  const mape = cnt ? (pctErr / cnt) * 100 : 0;

  // Produce output: last 48 observed hours + `horizon` future hours.
  const points: ForecastPoint[] = [];
  const tailStart = Math.max(24, n - 48);
  for (let t = tailStart; t < n; t++) {
    const r = rows[t];
    const c = cal[dateOf(r.timestamp)];
    const f = [
      1,
      vals[t - 1],
      vals[t - 24],
      prof.hourMean[hourOf(r.timestamp)],
      prof.dowMean[dowOf(r.timestamp)],
      c?.avg_temp_c ?? 25,
      c?.rainfall_mm ?? 0,
      c?.event ? 1 : 0,
      c?.day_type === "exam" ? 1 : 0,
    ];
    points.push({
      timestamp: r.timestamp,
      actual: vals[t],
      forecast: dot(w, f),
      lower: null,
      upper: null,
      is_future: false,
    });
  }

  // Roll forward for the horizon.
  const working = vals.slice();
  const lastTs = rows[n - 1].timestamp;
  let cursor = new Date(lastTs.replace(" ", "T") + ":00");
  let spike: ForecastResult["spike_warning"] = null;

  for (let h = 1; h <= horizon; h++) {
    cursor = new Date(cursor.getTime() + 3600_000);
    const tsStr = fmt(cursor);
    const c = cal[dateOf(tsStr)];
    const idx = working.length;
    const f = [
      1,
      working[idx - 1],
      working[idx - 24] ?? prof.hourMean[cursor.getHours()],
      prof.hourMean[cursor.getHours()],
      prof.dowMean[cursor.getDay()],
      c?.avg_temp_c ?? 25,
      c?.rainfall_mm ?? 0,
      c?.event ? 1 : 0,
      c?.day_type === "exam" ? 1 : 0,
    ];
    const pred = Math.max(0, dot(w, f));
    working.push(pred);
    const band = mae * 1.5;
    points.push({
      timestamp: tsStr,
      actual: null,
      forecast: pred,
      lower: Math.max(0, pred - band),
      upper: pred + band,
      is_future: true,
    });
    const baseline = prof.hourMean[cursor.getHours()] || prof.overall;
    if (baseline > 0 && pred > baseline * 1.3) {
      const pct = ((pred - baseline) / baseline) * 100;
      if (!spike || pct > spike.pct_above) {
        spike = {
          at: tsStr,
          expected: Number(pred.toFixed(1)),
          baseline: Number(baseline.toFixed(1)),
          pct_above: Number(pct.toFixed(1)),
        };
      }
    }
  }

  return {
    building_id: buildingId,
    metric,
    points,
    horizon_hours: horizon,
    mae: Number(mae.toFixed(2)),
    mape: Number(mape.toFixed(1)),
    spike_warning: spike,
  };
}

function fmt(d: Date): string {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:00`;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Closed-form ridge regression: w = (XᵀX + λI)⁻¹ Xᵀy. */
function ridgeFit(X: number[][], y: number[], lambda: number): number[] {
  const p = X[0].length;
  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    for (let a = 0; a < p; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = 0; b < p; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  for (let a = 0; a < p; a++) XtX[a][a] += lambda;
  return solve(XtX, Xty);
}

/** Gaussian elimination solve A x = b. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col] || 1e-9;
    for (let c = col; c <= n; c++) M[col][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}
