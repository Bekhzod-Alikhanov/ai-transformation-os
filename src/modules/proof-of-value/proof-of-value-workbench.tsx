"use client";

import { CheckCircle2, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { proofOfValueTemplates } from "@/modules/demo/aster-data";

type Replay = { templateId: string; output: string; quality: string } | null;

const outputs: Record<string, string> = {
  "support-triage":
    "Priority 2 · Card dispute · Route to Payments Operations. Human review is required before responding.",
  "executive-reporting":
    "Northstar is amber: the latest finance export conflicts with the draft narrative. Reconcile before publication.",
  "procurement-analysis":
    "Vendor Alpha leads on readiness; Vendor Beta has two unresolved data-residency exceptions.",
};

export function ProofOfValueWorkbench() {
  const [replay, setReplay] = useState<Replay>(null);
  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#e4e5df] p-5">
        <div>
          <h2 className="text-lg font-semibold">Proof-of-value workbench</h2>
          <p className="mt-1 text-xs text-[#70736a]">
            Synthetic Replay and Live mode share the same governed event schema.
          </p>
        </div>
        <Badge tone="value">Synthetic replay</Badge>
      </div>
      <div className="grid gap-px bg-[#e5e6e0] md:grid-cols-3">
        {proofOfValueTemplates.map((template) => (
          <div className="bg-white p-5" key={template.id}>
            <p className="text-sm font-semibold">{template.name}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-[#85887f]">
                  Baseline
                </p>
                <p className="mt-1 font-semibold">{template.baseline}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-[#85887f]">
                  Assisted
                </p>
                <p className="mt-1 font-semibold text-[#21806a]">
                  {template.assisted}
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-[#777a71]">
              <span>{Math.round(template.quality * 100)}% quality</span>
              <span>{template.cost}</span>
            </div>
            <Button
              className="mt-4"
              onClick={() =>
                setReplay({
                  templateId: template.id,
                  output: outputs[template.id]!,
                  quality: `${Math.round(template.quality * 100)}%`,
                })
              }
              size="sm"
              variant="secondary"
            >
              <Play className="size-3.5" />
              Run replay
            </Button>
          </div>
        ))}
      </div>
      {replay ? (
        <div
          aria-live="polite"
          className="border-t border-[#cdd5f3] bg-[#f7f8ff] p-5"
        >
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="size-4 text-[#25806a]" />
              Replay complete · {replay.quality} quality
            </p>
            <Button onClick={() => setReplay(null)} size="sm" variant="ghost">
              <RotateCcw className="size-3.5" />
              Clear
            </Button>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#53564e]">
            {replay.output}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#3157d5]">
            <ShieldCheck className="size-3.5" />
            Draft only · external action not executed · human review required
          </p>
        </div>
      ) : null}
    </Surface>
  );
}
