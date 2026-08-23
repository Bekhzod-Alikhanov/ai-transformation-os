"use client";

import {
  ArrowRight,
  CheckCircle2,
  Command,
  FileText,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

type Analysis = {
  reduction: number;
  value: string;
  change: string;
};

export function ControlTower() {
  const [command, setCommand] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  function runAnalysis() {
    const match = command.match(/(\d{1,2})\s*%/);
    const reduction = match ? Number(match[1]) : 30;
    const adjusted =
      Math.round((1_100_000 * (1 - reduction / 100)) / 10_000) * 10_000;
    setAnalysis({
      reduction,
      value:
        adjusted === 770_000 ? "$770K" : `$${Math.round(adjusted / 1_000)}K`,
      change: `-${reduction}% labour benefit`,
    });
  }

  return (
    <div
      className="grid scroll-mt-20 gap-5 xl:grid-cols-[1fr_340px]"
      id="control-tower"
    >
      <Surface className="overflow-hidden">
        <div className="border-b border-[#e2e3dd] bg-[#fafaf7] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-md bg-[#e7ebfb] text-[#3157d5]">
                  <Sparkles className="size-4" />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3157d5]">
                  Control Tower
                </p>
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">
                Ask, test, or prepare an action
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#6f7269]">
                Natural language proposes a validated patch. Deterministic
                services always recalculate the result.
              </p>
            </div>
            <Badge tone="value">Synthetic replay</Badge>
          </div>
        </div>
        <div className="p-5">
          <label className="sr-only" htmlFor="control-command">
            Ask the Control Tower
          </label>
          <div className="rounded-lg border border-[#d9dad4] bg-white p-2 shadow-[0_1px_3px_rgba(30,32,28,0.05)] focus-within:border-[#8296df] focus-within:ring-2 focus-within:ring-[#3157d5]/10">
            <textarea
              className="min-h-28 w-full resize-none border-0 bg-transparent p-2 text-sm leading-6 outline-none placeholder:text-[#9a9d94]"
              id="control-command"
              onChange={(event) => setCommand(event.target.value)}
              placeholder="For example: Assume labour savings are 30% lower and show the impact on the Client Reporting case."
              value={command}
            />
            <div className="flex items-center justify-between border-t border-[#ecece7] px-2 pt-2">
              <span className="flex items-center gap-1.5 text-[11px] text-[#65685f]">
                <Command className="size-3" /> Scenario changes stay temporary
              </span>
              <Button
                aria-label="Run analysis"
                disabled={!command.trim()}
                onClick={runAnalysis}
                size="sm"
              >
                <Sparkles className="size-3.5" /> Run analysis
              </Button>
            </div>
          </div>

          {analysis ? (
            <section
              aria-live="polite"
              className="mt-5 overflow-hidden rounded-lg border border-[#cdd5f3] bg-[#f7f8ff]"
            >
              <div className="flex items-center justify-between border-b border-[#dce1f6] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[#3157d5]" />
                  <h3 className="text-sm font-semibold">Scenario preview</h3>
                </div>
                <Badge tone="action">Temporary</Badge>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[#797c73]">
                    Validated patch
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {analysis.change}
                  </p>
                  <p className="mt-1 text-xs text-[#6d7067]">
                    Labour benefit component only
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[#797c73]">
                    Recalculated value
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[#3157d5]">
                    {analysis.value}
                  </p>
                  <p className="mt-1 text-xs text-[#6d7067]">
                    {analysis.value} risk-adjusted annual value
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[#797c73]">
                    Decision impact
                  </p>
                  <p className="mt-2 text-sm font-semibold">Experiment first</p>
                  <p className="mt-1 text-xs text-[#6d7067]">
                    Payback confidence falls below policy gate
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-[#dce1f6] bg-white/65 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#28715f]">
                  <CheckCircle2 className="size-3.5" /> Base assumptions
                  unchanged
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setAnalysis(null)}
                    size="sm"
                    variant="ghost"
                  >
                    <RotateCcw className="size-3.5" /> Discard
                  </Button>
                  <Button size="sm" variant="secondary">
                    <ShieldCheck className="size-3.5" /> Propose change
                  </Button>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </Surface>

      <div className="space-y-5">
        <Surface className="p-5">
          <h2 className="text-sm font-semibold">Command policy</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Read-only query", "Runs immediately", "value"],
              ["Temporary scenario", "Runs immediately", "value"],
              ["Persistent change", "Approval required", "condition"],
              ["External action", "Approval required", "risk"],
            ].map(([label, detail, tone]) => (
              <div
                className="flex items-center justify-between gap-3"
                key={label}
              >
                <span className="text-xs font-medium">{label}</span>
                <Badge tone={tone as "value" | "condition" | "risk"}>
                  {detail}
                </Badge>
              </div>
            ))}
          </div>
        </Surface>
        <Surface className="p-5">
          <h2 className="text-sm font-semibold">Try a command</h2>
          <div className="mt-3 space-y-2">
            {[
              "Show cases with weak evidence",
              "Draft the next steering brief",
              "Assume adoption reaches 80%",
            ].map((item) => (
              <button
                className="group flex w-full items-center justify-between rounded-md border border-[#e1e2dc] px-3 py-2.5 text-left text-xs text-[#5f625a] hover:border-[#bcc8ee] hover:bg-[#f7f8ff]"
                key={item}
                onClick={() => setCommand(item)}
                type="button"
              >
                <span className="flex items-center gap-2">
                  {item.includes("Draft") ? (
                    <FileText className="size-3.5" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  {item}
                </span>
                <ArrowRight className="size-3.5 opacity-50 group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}
