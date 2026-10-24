import { PageHeader } from "@/components/ui";
import ValidationClient from "./ValidationClient";

export const dynamic = "force-static";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Data Validation & Model Testing Sandbox"
        subtitle="Push test data through the live model + telemetry store and verify the dashboard reflects ground truth"
      />
      <ValidationClient />
    </div>
  );
}
