import { FileDown, Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/surface";
import { cn } from "@/lib/utils";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { PilotPortfolio } from "@/modules/pilots/pilot-portfolio";

export const metadata = { title: "Pilots" };

export default async function PilotsPage() {
  await requireWorkspaceCapability("pilots");
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Deliver"
        title="Pilot portfolio"
        description="Operate 0–30, 31–60, and 61–90 day plans with measurable value, adoption, quality, risk, and decision gates."
        action={
          <div className="flex gap-2">
            <a
              className={cn(
                buttonVariants({ size: "sm", variant: "secondary" }),
              )}
              href="/api/exports/steering-pack"
            >
              <FileDown className="size-3.5" />
              Steering pack
            </a>
            <Link
              className={cn(buttonVariants({ size: "sm" }))}
              href="/use-cases/client-status-reporting"
            >
              <Plus className="size-3.5" />
              Build pilot
            </Link>
          </div>
        }
      />
      <PilotPortfolio />
    </div>
  );
}
