import { SectionHeader } from "@/components/ui/surface";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { SettingsPanel } from "@/modules/settings/settings-panel";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireWorkspaceCapability("settings");
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Govern"
        title="Organisation settings"
        description="Manage tenant membership, roles, model routing, secrets posture, and the authorised synthetic-demo reset."
      />
      <SettingsPanel />
    </div>
  );
}
