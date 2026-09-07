import { redirect } from "next/navigation";

import { MyWorkQueues } from "@/modules/dashboard/my-work-queues";
import { loadMyWorkQueueCounts } from "@/modules/dashboard/my-work-queues.server";
import { SignInForm } from "@/modules/auth/sign-in-form";
import { getRequestActor } from "@/modules/auth/request-actor";
import { getWorkspaceContext } from "@/modules/auth/workspace-context.server";

export default async function HomePage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return <SignInForm />;
  if (workspace.mode === "live") {
    const actor = await getRequestActor();
    return (
      <MyWorkQueues
        queues={await loadMyWorkQueueCounts(workspace, actor?.userId ?? "")}
      />
    );
  }
  redirect("/demo");
}
