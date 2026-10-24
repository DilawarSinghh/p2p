import { detectAnomalies } from "@/lib/anomaly";
import { PageHeader } from "@/components/ui";
import RootCauseClient from "./RootCauseClient";

export const dynamic = "force-static";

export default function Page() {
  const anomalies = detectAnomalies(2.5).slice(0, 40);
  return (
    <div>
      <PageHeader
        title="Anomaly & Root-Cause Attribution"
        subtitle="z-score detection → cross-referenced with manual_logs notes + calendar → ranked, justified actions"
      />
      <RootCauseClient anomalies={anomalies} />
    </div>
  );
}
