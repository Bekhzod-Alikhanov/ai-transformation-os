import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Database,
  FileText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { agentActivity } from "@/modules/demo/aster-data";

export function ActivityFeed() {
  const audit = [
    {
      actor: "Maya Chen",
      event: "Approved calendar event revision 3",
      object: "Pilot steering committee",
      time: "23 min ago",
      kind: "approval",
    },
    {
      actor: "Financial Engine",
      event: "Recalculated scenario v4",
      object: "Client Status Reporting",
      time: "41 min ago",
      kind: "calculation",
    },
    {
      actor: "Evidence Ledger",
      event: "Anchored 18 extracted claims",
      object: "Operations Baseline.xlsx",
      time: "1 hr ago",
      kind: "evidence",
    },
    {
      actor: "Risk policy",
      event: "Forced Stop classification",
      object: "Autonomous Trading Recommendation",
      time: "3 hr ago",
      kind: "policy",
    },
  ];
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Surface className="overflow-hidden">
        <div className="border-b border-[#e4e5df] p-5">
          <h2 className="text-lg font-semibold">Agent runs</h2>
          <p className="mt-1 text-xs text-[#70736a]">
            Model, latency, cost, evidence and outcome—without hidden reasoning.
          </p>
        </div>
        <div className="divide-y divide-[#e7e8e2]">
          {agentActivity.map((item) => (
            <div className="p-5" key={`${item.agent}-${item.time}`}>
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#e9edf9] text-[#3157d5]">
                  <Bot className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{item.agent}</p>
                    <Badge
                      tone={item.status === "attention" ? "condition" : "value"}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#62655d]">{item.task}</p>
                  <p className="mt-3 text-[11px] text-[#777a71]">
                    {item.model} · {item.latency} · {item.cost} · {item.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Surface>
      <Surface className="overflow-hidden">
        <div className="border-b border-[#e4e5df] p-5">
          <h2 className="text-lg font-semibold">Audit ledger</h2>
          <p className="mt-1 text-xs text-[#70736a]">
            Append-only organisation activity and execution receipts.
          </p>
        </div>
        <div className="divide-y divide-[#e7e8e2]">
          {audit.map((item) => {
            const Icon =
              item.kind === "approval"
                ? CheckCircle2
                : item.kind === "calculation"
                  ? Database
                  : item.kind === "policy"
                    ? CircleAlert
                    : FileText;
            return (
              <div className="flex gap-3 p-5" key={item.event}>
                <Icon
                  className={`mt-0.5 size-4 shrink-0 ${item.kind === "policy" ? "text-[#a43d36]" : "text-[#3157d5]"}`}
                />
                <div>
                  <p className="text-sm font-semibold">{item.event}</p>
                  <p className="mt-1 text-xs text-[#62655d]">{item.object}</p>
                  <p className="mt-2 text-[11px] text-[#777a71]">
                    {item.actor} · {item.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}
