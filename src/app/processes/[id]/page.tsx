import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { ProcessPageContent } from "./process-page-content";

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await requireWorkspaceCapability("processes");
  return <ProcessPageContent id={id} workspace={workspace} />;
}
