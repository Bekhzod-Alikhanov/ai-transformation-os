import { SectionHeader } from "@/components/ui/surface";
import { IntegrationsHub } from "@/modules/integrations/integrations-hub";

export const metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Govern"
        title="Integrations"
        description="Connect evidence sources incrementally. Unconfigured extension adapters stay visibly disabled and never imply operational access."
      />
      <IntegrationsHub />
    </div>
  );
}
