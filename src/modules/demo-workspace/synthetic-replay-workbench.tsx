"use client";
import { DeliveryWorkbench } from "@/modules/delivery-workbench/workbench";
export function SyntheticReplayWorkbench({
  organisationId,
}: {
  organisationId: string;
}) {
  // Rehearsal data is browser-local, not a claim of tenant-backed storage.
  void organisationId;
  return (
    <>
      <div className="border-b border-[#dedfd8] bg-[#f3f2ec] px-5 py-3 text-sm">
        <a className="font-semibold text-[#3157d5] underline" href="/workbench">
          Open consulting assessment workbench
        </a>
        <span>
          {" "}
          · Create independent engagements and review local evidence.
        </span>
      </div>
      <DeliveryWorkbench />
    </>
  );
}
