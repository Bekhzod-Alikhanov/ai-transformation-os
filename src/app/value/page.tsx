import { SectionHeader } from "@/components/ui/surface";
import { ValueDashboard } from "@/modules/value/value-dashboard";

export const metadata = { title: "Value" };

export default function ValuePage() {
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Measure"
        title="Realised value"
        description="Trace benefits from business-case assumptions to source-backed pilot measurements and finance-validated realised value."
      />
      <ValueDashboard />
    </div>
  );
}
