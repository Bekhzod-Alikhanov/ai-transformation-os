import { SectionHeader } from "@/components/ui/surface";
import { AutomationStudio } from "@/modules/automations/automation-studio";

export const metadata = { title: "Automations" };

export default function AutomationsPage() {
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
