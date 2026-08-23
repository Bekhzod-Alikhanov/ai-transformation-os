import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/surface";
import { ProcessTwin } from "@/modules/processes/process-twin";

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Discover · Process architect"
        title="Client status reporting twin"
        description={`Paired current and future workflow for ${id}. Nodes preserve actors, systems, controls, cycle time, handoffs, and failure modes.`}
        action={<Button size="sm">Edit operational metrics</Button>}
      />
      <div className="flex flex-wrap gap-2">
        <Badge tone="condition">Current · 490 min</Badge>
        <Badge tone="value">Future · 31 min</Badge>
        <Badge tone="action">Human approval retained</Badge>
      </div>
      <ProcessTwin />
    </div>
  );
}
