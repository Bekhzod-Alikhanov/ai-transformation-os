import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { EvidenceWorkbench } from "@/modules/evidence-review/evidence-workbench";
import { loadEvidenceWorkbenchData } from "@/modules/evidence-review/evidence-workbench-data.server";

export const metadata = { title: "Evidence desk" };

export default async function EvidencePage() {
  const workspace = await requireWorkspaceCapability("opportunities");
  const data = await loadEvidenceWorkbenchData(workspace);
  return (
    <EvidenceWorkbench {...data} organisationId={workspace.organisationId} />
  );
}
