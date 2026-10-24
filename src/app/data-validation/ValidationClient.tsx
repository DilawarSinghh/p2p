"use client";
import { useState, useCallback, useRef } from "react";
import {
  TestTube,
  Upload,
  PenLine,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
} from "lucide-react";
import { Card, Stat } from "@/components/ui";
import { BUILDING_IDS, WASTE_CLASSES } from "@/lib/constants";

type Mode = "manual" | "bulk";
type DataKind = "waste" | "telemetry";

interface VerifyResult {
  kind: "waste" | "telemetry";
  status: "success" | "mismatch" | "missing";
  label: string;
  expected_value: string | number | null;
  actual_system_value: string | number | null;
  variance_percentage: number | null;
  diagnostic_message: string;
  source: string;
  extra?: Record<string, unknown>;
}
interface VerifyResponse {
  status: "success" | "mismatch";
  summary: { total: number; success: number; mismatch: number; missing: number };
  results: VerifyResult[];
}

const WASTE_DEFAULTS = {
  building_id: "B07",
  weight_g: "480",
  moisture_pct: "60",
  metal_signal: "0",
  transparency: "0",
  acoustic_hardness: "0.1",
  expected_label: "food_organic",
};
const TELEMETRY_DEFAULTS = {
  building_id: "B01",
  timestamp: "2026-06-20 08:00",
  electricity_kwh: "15",
  water_litres: "",
};

export default function ValidationClient() {
  const [mode, setMode] = useState<Mode>("manual");
  const [dataKind, setDataKind] = useState<DataKind>("waste");
  const [waste, setWaste] = useState({ ...WASTE_DEFAULTS });
  const [tele, setTele] = useState({ ...TELEMETRY_DEFAULTS });
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // The exact input the user submitted (for the left "Test Input" pane).
  const [submittedInput, setSubmittedInput] = useState<Record<string, unknown>[]>([]);

  const runManual = useCallback(async () => {
    setLoading(true);
    setError(null);
    const row =
      dataKind === "waste"
        ? {
            kind: "waste",
            building_id: waste.building_id,
            weight_g: Number(waste.weight_g),
            moisture_pct: Number(waste.moisture_pct),
            metal_signal: Number(waste.metal_signal),
            transparency: Number(waste.transparency),
            acoustic_hardness: Number(waste.acoustic_hardness),
            expected_label: waste.expected_label || null,
          }
        : {
            kind: "telemetry",
            building_id: tele.building_id,
            timestamp: tele.timestamp,
            electricity_kwh: tele.electricity_kwh ? Number(tele.electricity_kwh) : null,
            water_litres: tele.water_litres ? Number(tele.water_litres) : null,
          };
    setSubmittedInput([row as Record<string, unknown>]);
    try {
      const res = await fetch("/api/verify-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Verification failed");
      else setResp(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [dataKind, waste, tele]);

  const runFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      // show a small preview of input rows
      const lines = text.trim().split(/\r?\n/);
      const headers = (lines[0] ?? "").split(",").map((h) => h.trim());
      const preview = lines.slice(1, 50).map((l) => {
        const cells = l.split(",");
        const o: Record<string, string> = {};
        headers.forEach((h, i) => (o[h] = (cells[i] ?? "").trim()));
        return o;
      });
      setSubmittedInput(preview);
      const res = await fetch("/api/verify-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Verification failed");
      else setResp(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) runFile(f);
  };

  return (
    <div className="space-y-4">
      {/* Mode toggles */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${mode === "manual" ? "bg-accent/20 text-accent" : "bg-panel2 text-slate-400"}`}
            onClick={() => setMode("manual")}
          >
            <PenLine size={14} /> Manual Entry
          </button>
          <button
            className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${mode === "bulk" ? "bg-accent/20 text-accent" : "bg-panel2 text-slate-400"}`}
            onClick={() => setMode("bulk")}
          >
            <Upload size={14} /> Bulk Upload
          </button>
        </div>
        {mode === "manual" && (
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              className={`px-3 py-1.5 text-sm ${dataKind === "waste" ? "bg-accent2/20 text-accent2" : "bg-panel2 text-slate-400"}`}
              onClick={() => setDataKind("waste")}
            >
              Waste (model)
            </button>
            <button
              className={`px-3 py-1.5 text-sm ${dataKind === "telemetry" ? "bg-accent2/20 text-accent2" : "bg-panel2 text-slate-400"}`}
              onClick={() => setDataKind("telemetry")}
            >
              Telemetry (DB)
            </button>
          </div>
        )}
      </div>

      {/* Input area */}
      <Card title={mode === "manual" ? "Test Data Input" : "Bulk CSV Upload"}>
        {mode === "manual" ? (
          dataKind === "waste" ? (
            <WasteForm waste={waste} setWaste={setWaste} />
          ) : (
            <TelemetryForm tele={tele} setTele={setTele} />
          )
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}
          >
            <Upload className="mx-auto text-muted mb-2" size={28} />
            <div className="text-sm text-slate-300">
              {fileName ? <span className="text-accent">{fileName}</span> : "Drop a CSV here, or click to browse"}
            </div>
            <div className="text-[11px] text-muted mt-2">
              Waste columns: building_id, weight_g, moisture_pct, metal_signal, transparency, acoustic_hardness, expected_label
              <br />
              Telemetry columns: building_id, timestamp, electricity_kwh (or water_litres)
            </div>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && runFile(e.target.files[0])}
            />
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          {mode === "manual" && (
            <button
              onClick={runManual}
              disabled={loading}
              className="btn btn-accent flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <TestTube size={15} />}
              {loading ? "Verifying…" : "Run Verification"}
            </button>
          )}
          {loading && mode === "bulk" && (
            <span className="text-sm text-muted flex items-center gap-2">
              <Loader2 size={15} className="animate-spin" /> Verifying against model / telemetry store…
            </span>
          )}
          {error && <span className="text-sm text-danger">⚠ {error}</span>}
        </div>
      </Card>

      {/* Summary stats */}
      {resp && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Rows Verified" value={resp.summary.total} />
          <Stat label="Matches" value={resp.summary.success} tone="good" />
          <Stat label="Mismatches" value={resp.summary.mismatch} tone={resp.summary.mismatch ? "danger" : "good"} />
          <Stat label="Missing (packet loss)" value={resp.summary.missing} tone={resp.summary.missing ? "warn" : "good"} />
        </div>
      )}

      {/* Split view */}
      {resp && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="① Test Input (what you submitted)">
            <div className="h-[420px] overflow-auto">
              {submittedInput.length === 0 ? (
                <div className="text-sm text-muted">No input captured.</div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-muted text-left border-b border-border">
                      {Object.keys(submittedInput[0]).map((k) => (
                        <th key={k} className="py-1.5 pr-2 whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {submittedInput.map((row, i) => (
                      <tr key={i} className="border-b border-border/40">
                        {Object.keys(submittedInput[0]).map((k) => (
                          <td key={k} className="py-1.5 pr-2 whitespace-nowrap text-slate-300">
                            {String(row[k] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          <Card title="② System Output & Verification">
            <div className="h-[420px] overflow-auto space-y-2">
              {resp.results.map((r, i) => (
                <ResultRow key={i} r={r} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ResultRow({ r }: { r: VerifyResult }) {
  const cfg = {
    success: { icon: <CheckCircle2 size={16} />, cls: "text-good", bg: "bg-good/10 border-good/30", label: "Match" },
    mismatch: { icon: <XCircle size={16} />, cls: "text-danger", bg: "bg-danger/10 border-danger/30", label: "Mismatch" },
    missing: { icon: <AlertTriangle size={16} />, cls: "text-warn", bg: "bg-warn/10 border-warn/30", label: "Packet Loss" },
  }[r.status];

  return (
    <div className={`rounded-lg p-3 border ${cfg.bg}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cfg.cls}>{cfg.icon}</span>
        <span className={`pill ${cfg.bg} ${cfg.cls} font-semibold`}>{cfg.label}</span>
        <span className="text-xs text-muted truncate">{r.label}</span>
        <span className="ml-auto text-[10px] text-muted">{r.source}</span>
      </div>
      <div className="flex items-center gap-2 text-xs mb-2">
        <span className="bg-panel2 rounded px-2 py-1 border border-border">
          expected: <span className="text-slate-200">{String(r.expected_value ?? "—")}</span>
        </span>
        <ArrowRight size={12} className="text-muted" />
        <span className="bg-panel2 rounded px-2 py-1 border border-border">
          system: <span className={cfg.cls}>{String(r.actual_system_value ?? "—")}</span>
        </span>
        {r.variance_percentage != null && (
          <span className="bg-panel2 rounded px-2 py-1 border border-border">
            Δ <span className={r.variance_percentage <= 1 ? "text-good" : "text-danger"}>{r.variance_percentage}%</span>
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400 leading-snug">{r.diagnostic_message}</p>
      {r.extra?.confidence != null && (
        <div className="text-[10px] text-muted mt-1">
          confidence {String(r.extra.confidence)}% · routed to {String(r.extra.routed_to)} · {String(r.extra.latency_ms)} ms
        </div>
      )}
      {r.extra?.duplicate_detected != null && (
        <div className="text-[10px] text-muted mt-1">
          records found {String(r.extra.records_found)} · duplicate {String(r.extra.duplicate_detected)} · lag {String(r.extra.ingestion_lag_minutes)}m
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="label block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-panel2 border border-border rounded-lg px-3 py-1.5 text-sm focus:border-accent outline-none"
      />
    </div>
  );
}

function WasteForm({
  waste,
  setWaste,
}: {
  waste: typeof WASTE_DEFAULTS;
  setWaste: (w: typeof WASTE_DEFAULTS) => void;
}) {
  const set = (k: keyof typeof WASTE_DEFAULTS) => (v: string) => setWaste({ ...waste, [k]: v });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div>
        <label className="label block mb-1">building_id</label>
        <select
          value={waste.building_id}
          onChange={(e) => set("building_id")(e.target.value)}
          className="w-full bg-panel2 border border-border rounded-lg px-3 py-1.5 text-sm"
        >
          {BUILDING_IDS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
      <Field label="weight_g" value={waste.weight_g} onChange={set("weight_g")} type="number" />
      <Field label="moisture_pct" value={waste.moisture_pct} onChange={set("moisture_pct")} type="number" />
      <Field label="metal_signal" value={waste.metal_signal} onChange={set("metal_signal")} type="number" />
      <Field label="transparency" value={waste.transparency} onChange={set("transparency")} type="number" />
      <Field label="acoustic_hardness" value={waste.acoustic_hardness} onChange={set("acoustic_hardness")} type="number" />
      <div className="col-span-2">
        <label className="label block mb-1">expected_label (ground truth)</label>
        <select
          value={waste.expected_label}
          onChange={(e) => set("expected_label")(e.target.value)}
          className="w-full bg-panel2 border border-border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">(none - judge by confidence)</option>
          {WASTE_CLASSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TelemetryForm({
  tele,
  setTele,
}: {
  tele: typeof TELEMETRY_DEFAULTS;
  setTele: (t: typeof TELEMETRY_DEFAULTS) => void;
}) {
  const set = (k: keyof typeof TELEMETRY_DEFAULTS) => (v: string) => setTele({ ...tele, [k]: v });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div>
        <label className="label block mb-1">building_id</label>
        <select
          value={tele.building_id}
          onChange={(e) => set("building_id")(e.target.value)}
          className="w-full bg-panel2 border border-border rounded-lg px-3 py-1.5 text-sm"
        >
          {BUILDING_IDS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
      <Field label="timestamp (YYYY-MM-DD HH:MM)" value={tele.timestamp} onChange={set("timestamp")} />
      <Field label="electricity_kwh" value={tele.electricity_kwh} onChange={set("electricity_kwh")} type="number" />
      <Field label="water_litres (optional)" value={tele.water_litres} onChange={set("water_litres")} type="number" />
      <div className="col-span-full flex items-center gap-1.5 text-[11px] text-muted">
        <FileText size={12} /> Leave electricity blank to verify water. The system compares against the stored hourly record for this building + hour.
      </div>
    </div>
  );
}
