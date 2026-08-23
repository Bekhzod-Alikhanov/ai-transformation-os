import { SectionHeader } from "@/components/ui/surface";
import { DecisionRoom } from "@/modules/decisions/decision-room";

export const metadata = { title: "Decision Room" };

export default function DecisionRoomPage() {
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Decide"
        title="Decision Room"
        description="Challenge the business case, inspect specialist objections, test temporary scenarios, and record policy-constrained executive decisions."
      />
      <DecisionRoom />
    </div>
  );
}
