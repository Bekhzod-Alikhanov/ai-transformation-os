import { SectionHeader } from "@/components/ui/surface";
import { ActivityFeed } from "@/modules/activity/activity-feed";

export const metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Measure"
        title="Agent and audit activity"
        description="Inspect model use, latency, estimated cost, concise rationale, evidence links, approvals, and immutable execution receipts."
      />
      <ActivityFeed />
    </div>
  );
}
