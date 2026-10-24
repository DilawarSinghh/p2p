import { getModelMetrics } from "@/lib/data";
import { forestInfo } from "@/lib/classifier";
import { PageHeader } from "@/components/ui";
import EdgeConsole from "./EdgeConsole";

export const dynamic = "force-static";

export default function Page() {
  const metrics = getModelMetrics();
  const info = forestInfo();
  return (
    <div>
      <PageHeader
        title="Edge Smart-Bin Classifier"
        subtitle="RandomForest over 5 physical sensors · pure-TS inference · no cloud GPU · <2s/event edge target"
      />
      <EdgeConsole metrics={metrics} info={info} />
    </div>
  );
}
