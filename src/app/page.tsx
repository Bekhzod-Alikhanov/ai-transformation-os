import { redirect } from "next/navigation";

import { MyWorkQueues } from "@/modules/dashboard/my-work-queues";
import { loadMyWorkQueueCounts } from "@/modules/dashboard/my-work-queues.server";
import { getRequestActor } from "@/modules/auth/request-actor";
import { getWorkspaceContext } from "@/modules/auth/workspace-context.server";

export default async function HomePage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) redirect("/demo");
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
