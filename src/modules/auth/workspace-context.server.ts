import { cache } from "react";

import { getRequestActor } from "./request-actor";
import { workspaceContextForActor } from "./workspace-context";

export const getWorkspaceContext = cache(async () => {
  const actor = await getRequestActor();
  return actor ? workspaceContextForActor(actor) : null;
});
