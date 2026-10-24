import { forecast } from "@/lib/forecast";
import { getBuildings } from "@/lib/data";
import { BUILDING_IDS } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import ForecastClient from "./ForecastClient";

export const dynamic = "force-static";

export default function Page() {
  const buildings = getBuildings();
  // Precompute 12h forecasts for every building x metric for instant switching.
  const metrics = ["electricity_kwh", "water_litres", "footfall"] as const;
  const data: Record<string, Record<string, ReturnType<typeof forecast>>> = {};
  for (const b of BUILDING_IDS) {
    data[b] = {};
    for (const m of metrics) data[b][m] = forecast(b, m, 12);
  }
  return (
    <div>
      <PageHeader
        title="Short-Horizon Forecasting (6–12h)"
        subtitle="Ridge autoregression + calendar/weather drivers · edge-quantized vs cloud-LSTM trade-off"
      />
      <ForecastClient buildings={buildings} data={data} />
    </div>
  );
}
