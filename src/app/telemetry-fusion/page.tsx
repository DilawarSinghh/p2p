import { fusionOverview } from "@/lib/fusion";
import { BUILDING_IDS } from "@/lib/constants";
import { bufferTimeline } from "@/lib/fusion";
import { PageHeader } from "@/components/ui";
import FusionClient from "./FusionClient";

export const dynamic = "force-static";

export default function Page() {
  const overview = fusionOverview();
  // Precompute buffer timelines for all buildings so the client can switch instantly.
  const timelines = Object.fromEntries(
    BUILDING_IDS.map((b) => [b, bufferTimeline(b)])
  );
  return (
    <div>
      <PageHeader
        title="Multi-Modal Sensor Fusion & Connectivity"
        subtitle="Async stream alignment · gateway dropout detection · offline buffer replay · dedup & reconciliation"
      />
      <FusionClient overview={overview} timelines={timelines} />
    </div>
  );
}
