"use client";
import { DeliveryWorkbench } from "@/modules/delivery-workbench/workbench";
export function SyntheticReplayWorkbench({
  organisationId,
}: {
  organisationId: string;
}) {
  // Rehearsal data is browser-local, not a claim of tenant-backed storage.
  void organisationId;
  return <DeliveryWorkbench />;
}
