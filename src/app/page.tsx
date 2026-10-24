import Link from "next/link";
import { campusOverview } from "@/lib/overview";
import { Stat, Card } from "@/components/ui";
import { TrendArea, SimpleBar } from "@/components/charts";

export const dynamic = "force-static";

export default function Home() {
  const o = campusOverview();
  const k = o.kpis;
  const h = o.data_health;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-slate-100">Campus Command Center</h1>
        <p className="text-sm text-muted mt-0.5">
          Synthetic benchmark · 8 buildings · 120 days (20 Jun – 17 Oct 2026) · IoT + smart-bin + manual telemetry
        </p>
        <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-100">New to the project?</p>
            <p className="text-xs text-muted mt-1">Understand the problem, AI workflow, challenge mapping, and 2-minute judge walkthrough.</p>
          </div>
          <Link href="/project-guide" className="btn btn-accent">Open Project Guide →</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Grid Electricity" value={`${k.grid_kwh.toLocaleString()} kWh`} sub={`Rs. ${k.energy_cost_rs.toLocaleString()} @ Rs.8/kWh`} />
        <Stat label="Solar Generated" value={`${k.solar_kwh.toLocaleString()} kWh`} sub={`Rs. ${k.solar_savings_rs.toLocaleString()} offset`} tone="good" />
        <Stat label="Water Draw" value={`${k.water_kl.toLocaleString()} kL`} sub="potable + utility" tone="accent" />
        <Stat label="Grid CO₂" value={`${k.co2_tonnes} t`} sub="@ 0.70 kg/kWh" tone="warn" />
        <Stat label="Landfill" value={`${k.landfill_kg.toLocaleString()} kg`} tone="danger" />
        <Stat label="Diversion Rate" value={`${k.diversion_pct}%`} sub="recycled + composted" tone="good" />
        <Stat label="Hourly Rows" value={h.hourly_rows.toLocaleString()} sub={`${h.buffered} buffered · ${h.duplicates} dup`} />
        <Stat label="Smart-bin Train" value={h.train_events.toLocaleString()} sub={`${h.manual_logs} manual logs`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <Card title="Campus Resource Trend (daily)" className="lg:col-span-2">
          <TrendArea
            data={o.series}
            keys={[
              { key: "electricity", color: "#38bdf8", name: "Electricity (kWh)" },
              { key: "solar", color: "#4ade80", name: "Solar (kWh)" },
              { key: "water", color: "#2dd4bf", name: "Water (kL)" },
            ]}
          />
        </Card>
        <Card title="Landfill Output by Building (kg)">
          <SimpleBar
            data={o.perBuilding.map((b) => ({ name: b.building_id, landfill: b.landfill }))}
            dataKey="landfill"
            color="#f87171"
          />
        </Card>
      </div>

      <Card title="Building Portfolio">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted text-xs border-b border-border">
                <th className="py-2 pr-3">ID</th>
                <th className="pr-3">Building</th>
                <th className="pr-3">Type</th>
                <th className="pr-3 text-right">Electricity kWh</th>
                <th className="pr-3 text-right">Solar kWh</th>
                <th className="pr-3 text-right">Landfill kg</th>
                <th className="pr-3 text-right">Contam %</th>
                <th className="pr-3">Assets</th>
              </tr>
            </thead>
            <tbody>
              {o.perBuilding.map((b) => (
                <tr key={b.building_id} className="border-b border-border/50 hover:bg-panel2/50">
                  <td className="py-2 pr-3 text-accent">{b.building_id}</td>
                  <td className="pr-3">{b.name}</td>
                  <td className="pr-3 text-muted capitalize">{b.type}</td>
                  <td className="pr-3 text-right">{b.electricity.toLocaleString()}</td>
                  <td className="pr-3 text-right text-good">{b.solar ? b.solar.toLocaleString() : "—"}</td>
                  <td className="pr-3 text-right text-danger">{b.landfill.toLocaleString()}</td>
                  <td className="pr-3 text-right">
                    <span className={b.contamination >= 8 ? "text-warn" : "text-good"}>{b.contamination}</span>
                  </td>
                  <td className="pr-3 text-xs">
                    {b.has_solar ? <span className="pill bg-good/15 text-good mr-1">solar</span> : null}
                    {b.has_composter ? <span className="pill bg-accent/15 text-accent">composter</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
