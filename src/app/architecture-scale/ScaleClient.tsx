"use client";
import { useState } from "react";
import { Card, Stat } from "@/components/ui";
import { SimpleBar } from "@/components/charts";
import {
  ELECTRICITY_TARIFF_RS_PER_KWH,
  COMPOST_VALUE_RS_PER_KG,
} from "@/lib/constants";

// Per-building Bill of Materials (edge hardware).
const BOM = [
  { item: "ESP32-S3 edge node", qty: 4, unit: 650, note: "smart-bin MCU + inference" },
  { item: "HX711 + load cell (bin weight)", qty: 4, unit: 420, note: "weight_g" },
  { item: "Capacitive moisture probe", qty: 4, unit: 180, note: "moisture_pct" },
  { item: "Inductive metal sensor", qty: 4, unit: 220, note: "metal_signal" },
  { item: "Photodiode optical array", qty: 4, unit: 160, note: "transparency" },
  { item: "Piezo acoustic sensor", qty: 4, unit: 140, note: "acoustic_hardness" },
  { item: "PZEM-004T energy meter", qty: 2, unit: 520, note: "electricity_kwh" },
  { item: "YF-S201 water flow sensor", qty: 2, unit: 260, note: "water_litres" },
  { item: "Raspberry Pi 4 edge gateway", qty: 1, unit: 4800, note: "LoRaWAN/MQTT + SQLite buffer" },
  { item: "LoRaWAN module + enclosure + wiring", qty: 1, unit: 2600, note: "connectivity + install" },
];

export default function ScaleClient({
  drift,
  gaming,
  concept,
}: {
  drift: ReturnType<typeof import("@/lib/resilience").sensorDriftSignal>;
  gaming: ReturnType<typeof import("@/lib/resilience").gamingSignals>;
  concept: ReturnType<typeof import("@/lib/resilience").conceptDriftSignal>;
}) {
  const perBuilding = BOM.reduce((s, b) => s + b.qty * b.unit, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BomCard perBuilding={perBuilding} />
        <ScaleSimulator perBuilding={perBuilding} />
      </div>

      <Card title="Failure-Mode Mitigation Monitor">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DriftCard drift={drift} />
          <GamingCard gaming={gaming} />
          <ConceptCard concept={concept} />
        </div>
      </Card>
    </div>
  );
}

function BomCard({ perBuilding }: { perBuilding: number }) {
  const usd = (perBuilding / 84).toFixed(0);
  return (
    <Card title="Per-Building Hardware BOM" right={<span className="pill bg-accent/15 text-accent">Rs. {perBuilding.toLocaleString()} (~${usd})</span>}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="py-1.5">Component</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Unit ₹</th>
              <th className="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {BOM.map((b) => (
              <tr key={b.item} className="border-b border-border/40">
                <td className="py-1.5">
                  {b.item}
                  <div className="text-[10px] text-muted">{b.note}</div>
                </td>
                <td className="text-right">{b.qty}</td>
                <td className="text-right">{b.unit}</td>
                <td className="text-right text-slate-200">{(b.qty * b.unit).toLocaleString()}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">Total per building</td>
              <td></td>
              <td></td>
              <td className="text-right text-accent">Rs. {perBuilding.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <RoiNote perBuilding={perBuilding} />
    </Card>
  );
}

function RoiNote({ perBuilding }: { perBuilding: number }) {
  // Illustrative: 8% electricity cut on ~300 kWh/day + compost value.
  const dailyKwhSaved = 300 * 0.08;
  const dailyElecRs = dailyKwhSaved * ELECTRICITY_TARIFF_RS_PER_KWH;
  const dailyCompostRs = 5 * COMPOST_VALUE_RS_PER_KG; // ~5 kg compost/day
  const dailyTotal = dailyElecRs + dailyCompostRs;
  const payback = Math.round(perBuilding / dailyTotal);
  return (
    <div className="mt-3 text-[11px] text-muted bg-panel2 rounded p-2 border border-border">
      ROI: at an 8% electricity reduction (~{dailyKwhSaved.toFixed(0)} kWh/day × Rs.{ELECTRICITY_TARIFF_RS_PER_KWH}) plus
      compost value (~Rs.{dailyCompostRs}/day), savings ≈ Rs.{Math.round(dailyTotal)}/day →
      <span className="text-good"> payback ≈ {payback} days (~{(payback / 30).toFixed(1)} months)</span>.
    </div>
  );
}

function ScaleSimulator({ perBuilding }: { perBuilding: number }) {
  const [n, setN] = useState(8);
  const capex = perBuilding * n;
  // Edge aggregation keeps cloud bandwidth ~constant per building.
  const cloudMbPerDay = n * 0.9; // aggregated summaries, not raw streams
  const rawMbPerDay = n * 42; // if streaming raw
  const gateways = Math.ceil(n / 10); // hierarchical federation: ~10 buildings/cluster

  const chart = [3, 8, 15, 30, 50].map((x) => ({
    name: `${x}`,
    cloud: Number((x * 0.9).toFixed(1)),
    raw: Number((x * 42).toFixed(0)),
  }));

  return (
    <Card title="Scaling Simulator — 3 to 50 buildings">
      <input type="range" min={3} max={50} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-full accent-accent" />
      <div className="flex justify-between text-[10px] text-muted">
        <span>3</span><span>buildings: <span className="text-accent font-semibold">{n}</span></span><span>50</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Stat label="Hardware CapEx" value={`Rs. ${(capex / 100000).toFixed(1)}L`} sub={`${n} × Rs.${perBuilding.toLocaleString()}`} />
        <Stat label="Edge Gateways" value={gateways} sub="~10 buildings / LoRaWAN cluster" tone="accent" />
        <Stat label="Cloud Bandwidth" value={`${cloudMbPerDay.toFixed(1)} MB/d`} sub="edge-aggregated" tone="good" />
        <Stat label="Raw (if unaggregated)" value={`${rawMbPerDay} MB/d`} sub="avoided" tone="danger" />
      </div>
      <div className="mt-3">
        <SimpleBar data={chart} dataKey="cloud" color="#4ade80" height={160} />
      </div>
      <p className="text-[11px] text-muted mt-2">
        No redesign needed: buildings federate under hierarchical MQTT/LoRaWAN clusters; Supabase partitions
        <span className="text-slate-300"> hourly_streams by building_id + month</span>; each edge gateway aggregates
        locally so cloud bandwidth grows linearly and stays tiny.
      </p>
    </Card>
  );
}

function DriftCard({ drift }: { drift: ReturnType<typeof import("@/lib/resilience").sensorDriftSignal> }) {
  const drifting = Math.abs(drift.moisture_drift_pct) > 5 || Math.abs(drift.transparency_drift_pct) > 5;
  return (
    <div className="stat">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-200">① Sensor Drift / Fouling</span>
        <span className={`pill ${drifting ? "bg-warn/15 text-warn" : "bg-good/15 text-good"}`}>{drifting ? "drift seen" : "stable"}</span>
      </div>
      <p className="text-[11px] text-muted mb-2">B07 Food Court — optical/dielectric sensors coated by food residue.</p>
      <div className="text-xs space-y-1">
        <div className="flex justify-between"><span className="text-muted">Transparency early→late</span><span>{drift.early_transparency} → {drift.late_transparency}</span></div>
        <div className="flex justify-between"><span className="text-muted">Moisture early→late</span><span>{drift.early_moisture} → {drift.late_moisture}%</span></div>
      </div>
      <div className="mt-2 text-[11px] text-good">Mitigation: auto-zero tare between disposals + cross-sensor residual check to re-baseline.</div>
    </div>
  );
}

function GamingCard({ gaming }: { gaming: ReturnType<typeof import("@/lib/resilience").gamingSignals> }) {
  return (
    <div className="stat">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-200">② Credit Gaming</span>
        <span className="pill bg-danger/15 text-danger">{gaming.flagged} flagged</span>
      </div>
      <p className="text-[11px] text-muted mb-2">Heavy, hard, dry, opaque drops = likely stones/bottles farming weight credits.</p>
      <div className="text-xs space-y-1">
        {gaming.hotspots.slice(0, 4).map((h) => (
          <div key={h.bin_id} className="flex justify-between">
            <span className="text-muted">{h.bin_id}</span>
            <span className="text-danger">{h.count} events</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-good">Mitigation: rate-limit per student-ID/turnstile + reject acoustic/transparency anomalies.</div>
    </div>
  );
}

function ConceptCard({ concept }: { concept: ReturnType<typeof import("@/lib/resilience").conceptDriftSignal> }) {
  return (
    <div className="stat">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-200">③ Concept Drift</span>
        <span className="pill bg-accent/15 text-accent">{concept.length} regimes</span>
      </div>
      <p className="text-[11px] text-muted mb-2">Waste regime shifts across semester phases (break→working→exam).</p>
      <div className="text-xs space-y-1">
        {concept.map((r) => (
          <div key={r.regime} className="flex justify-between">
            <span className="text-muted capitalize">{r.regime.replace("_", " ")}</span>
            <span>{r.events} ev · {r.avg_weight_g}g avg</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-good">Mitigation: contextual regime switching on calendar.day_type + weekly shadow re-calibration.</div>
    </div>
  );
}
