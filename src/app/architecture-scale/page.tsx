import {
  sensorDriftSignal,
  gamingSignals,
  conceptDriftSignal,
} from "@/lib/resilience";
import { PageHeader } from "@/components/ui";
import ScaleClient from "./ScaleClient";

export const dynamic = "force-static";

export default function Page() {
  const drift = sensorDriftSignal();
  const gaming = gamingSignals();
  const concept = conceptDriftSignal();
  return (
    <div>
      <PageHeader
        title="Architecture, Cost & Resilience"
        subtitle="Per-building BOM (~Rs. 18,500) · 3→30+ scaling simulator · 3 live failure-mode monitors"
      />
      <ScaleClient drift={drift} gaming={gaming} concept={concept} />
    </div>
  );
}
