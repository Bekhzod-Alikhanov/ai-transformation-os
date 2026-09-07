import { SectionHeader } from "@/components/ui/surface";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { ModelLab } from "@/modules/model-lab/model-lab";
import { ProofOfValueWorkbench } from "@/modules/proof-of-value/proof-of-value-workbench";

export const metadata = { title: "Model Lab" };

export default async function ModelLabPage() {
  await requireWorkspaceCapability("model_lab");
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Decide · Model governance"
        title="Model Lab"
        description="Compare routing policies on fixed, versioned evaluation data with schema, citation, quality, latency, token, and cost measurements."
      />
      <ModelLab />
      <ProofOfValueWorkbench />
    </div>
  );
}
