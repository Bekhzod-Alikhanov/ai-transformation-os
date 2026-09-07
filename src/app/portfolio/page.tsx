import { LiveEmptyState } from "@/components/shell/live-empty-state";
import { SectionHeader } from "@/components/ui/surface";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { PortfolioDashboard } from "@/modules/portfolio/portfolio-dashboard";

export const metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const workspace = await requireWorkspaceCapability("portfolio");
  if (workspace.mode === "live")
    return (
      <LiveEmptyState
        description="Prioritisation will appear after this organisation has evidence-backed opportunities."
        eyebrow="Decide"
        title="No live portfolio yet"
      />
    );
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
