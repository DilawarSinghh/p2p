import { buildingScores, campusImpact } from "@/lib/gamification";
import { PageHeader } from "@/components/ui";
import IncentivesClient from "./IncentivesClient";

export const dynamic = "force-static";

export default function Page() {
  const scores = buildingScores();
  const impact = campusImpact();
  return (
    <div>
      <PageHeader
        title="Circular Economy + Green Credits"
        subtitle="Green-score leaderboard, contamination-gated credit ledger, composting loop, and a measurable behaviour-nudge mechanism"
      />
      <IncentivesClient scores={scores} impact={impact} />
    </div>
  );
}
