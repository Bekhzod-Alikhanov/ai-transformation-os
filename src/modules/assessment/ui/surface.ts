import type { ReactNode } from "react";
import type {
  Engagement,
  Opportunity,
  RecommendationSnapshot,
  Workspace,
} from "../types";

export type Section =
  "brief" | "evidence" | "options" | "recommendation" | "deliverables";

/** Task 4 boundary. Snapshot exports must derive solely from the captured record;
 * draft exports explicitly label the saved current base as unreviewed. */
export type DeliverableSelection =
  | { kind: "snapshot"; snapshot: RecommendationSnapshot }
  | { kind: "draft"; engagement: Engagement; opportunity: Opportunity };
export interface DeliverablesProps {
  selection: DeliverableSelection;
  brand: Workspace["brand"];
  includeInternalNotes: boolean;
}
export type NavigationTarget = {
  section: Section;
  engagementId?: string;
  opportunityId?: string;
  recordId?: string;
};
export type InspectorContent = { title: string; content: ReactNode };
/** Saves against the latest committed workspace revision; rejects on failure.
 * Mutators receive a cloned current engagement, never a stale render snapshot. */
export type SaveEngagement = (
  detail: string,
  update: (draft: Engagement) => void,
) => Promise<Engagement>;
export interface SurfaceProps {
  engagement: Engagement;
  opportunity: Opportunity | null;
  busy: boolean;
  save: SaveEngagement;
  navigate: (target: NavigationTarget) => void;
  inspect: (content: InspectorContent) => void;
  recordId?: string;
}
