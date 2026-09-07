import { SectionHeader } from "@/components/ui/surface";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { AutomationStudio } from "@/modules/automations/automation-studio";

export const metadata = { title: "Automations" };

export default async function AutomationsPage() {
  await requireWorkspaceCapability("automations");
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Deliver"
        title="Automation studio"
        description="Build governed transformation workflows from validated WHEN, IF, THEN, and APPROVAL primitives."
      />
      <AutomationStudio />
    </div>
  );
}
