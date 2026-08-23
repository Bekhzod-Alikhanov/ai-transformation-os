import { SectionHeader } from "@/components/ui/surface";
import { PortfolioDashboard } from "@/modules/portfolio/portfolio-dashboard";

export const metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Decide"
        title="Portfolio prioritisation"
        description="Balance value, strategic fit, feasibility, readiness, and inverse risk using explicit organisation-owned weights."
      />
      <PortfolioDashboard />
    </div>
  );
}
