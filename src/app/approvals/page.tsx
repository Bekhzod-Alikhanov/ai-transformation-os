import { SectionHeader } from "@/components/ui/surface";
import { ApprovalCentre } from "@/modules/approvals/approval-centre";

export const metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Govern"
        title="Approval centre"
        description="Review the exact immutable payload before any persistent or external action. Execution rechecks permission, policy, hash, expiry, and idempotency."
      />
      <ApprovalCentre />
    </div>
  );
}
