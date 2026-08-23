import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/surface";
import { OpportunityActions } from "@/modules/opportunities/opportunity-actions";
import { OpportunityTable } from "@/modules/opportunities/opportunity-table";

export const metadata = { title: "Opportunities" };

export default function OpportunitiesPage() {
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Discover"
        title="Opportunity portfolio"
        description="27 evidence-backed opportunities across eight Aster business units. Classification is deterministic; evidence sufficiency remains visible as a separate decision signal."
        action={<OpportunityActions />}
      />
      <div className="flex flex-wrap gap-2">
        <Badge tone="value">27 opportunities</Badge>
        <Badge tone="action">$8.4M annual value</Badge>
        <Badge tone="condition">7 need evidence</Badge>
        <Badge tone="risk">3 policy stops</Badge>
      </div>
      <OpportunityTable />
    </div>
  );
}
