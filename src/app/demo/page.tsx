import { redirect } from "next/navigation";

import { getWorkspaceContext } from "@/modules/auth/workspace-context.server";
import { WorkspaceProvider } from "@/modules/auth/workspace-provider";
import { SyntheticReplayWorkbench } from "@/modules/demo-workspace/synthetic-replay-workbench";

export const metadata = { title: "Synthetic Replay" };

export default async function DemoPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return redirect("/api/auth/demo?returnTo=/demo");
  if (workspace.mode === "live") return redirect("/");

  return (
    <WorkspaceProvider workspace={workspace}>
      <SyntheticReplayWorkbench organisationId={workspace.organisationId} />
    </WorkspaceProvider>
  );
}
