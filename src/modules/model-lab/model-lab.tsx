"use client";

import {
  CheckCircle2,
  Clock3,
  DollarSign,
  FlaskConical,
  Gauge,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { modelEvaluations } from "@/modules/demo/aster-data";

export function ModelLab() {
  const [complete, setComplete] = useState(false);
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e4e5df] p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777a71]">
                Fixed evaluation dataset
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                Opportunity analysis benchmark
              </h2>
              <p className="mt-1 text-xs text-[#70736a]">
                Evaluation set v2026.08.1 · 84 cases · 12 adversarial documents
              </p>
            </div>
            <Button
              aria-label="Run benchmark"
              onClick={() => setComplete(true)}
              size="sm"
            >
              <Play className="size-3.5" />
              Run benchmark
            </Button>
          </div>
          {complete ? (
            <div
              aria-live="polite"
              className="flex items-center gap-2 border-b border-[#b9ddd3] bg-[#eef8f4] px-5 py-3 text-sm font-medium text-[#176c59]"
            >
              <CheckCircle2 className="size-4" />
              Benchmark replay complete
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-left">
              <thead>
                <tr className="border-b border-[#e5e6e0] bg-[#fafaf7] text-[10px] uppercase tracking-[0.12em] text-[#7b7e75]">
                  <th className="px-5 py-3">Model</th>
                  <th className="px-4 py-3">Quality</th>
                  <th className="px-4 py-3">Grounded</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3">Cost / run</th>
                  <th className="px-4 py-3">Failures</th>
                  <th className="px-5 py-3">Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e8e2]">
                {modelEvaluations.map((row, index) => (
                  <tr key={row.model}>
                    <td className="px-5 py-4 text-sm font-semibold">
                      {row.model}
                    </td>
                    <td className="px-4 py-4 text-sm">{row.quality}</td>
                    <td className="px-4 py-4 text-sm">{row.groundedness}</td>
                    <td className="px-4 py-4 text-sm">{row.latency}s</td>
                    <td className="px-4 py-4 text-sm">
                      ${row.cost.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-sm">{row.failures}</td>
                    <td className="px-5 py-4">
                      <Badge tone={index === 1 ? "value" : "neutral"}>
                        {index === 1
                          ? "Default"
                          : index === 0
                            ? "Deep work"
                            : "Fast path"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
        <Surface className="p-5">
          <FlaskConical className="size-5 text-[#3157d5]" />
          <h2 className="mt-3 text-sm font-semibold">
            Reproducibility contract
          </h2>
          <div className="mt-4 space-y-3">
            {[
              [ShieldCheck, "Schema + citation checks"],
              [Gauge, "Calibrated judge rubric"],
              [Clock3, "Latency + token capture"],
              [DollarSign, "Price config snapshot"],
            ].map(([Icon, label]) => (
              <div
                className="flex items-center gap-2 text-xs"
                key={String(label)}
              >
                <Icon className="size-3.5 text-[#696c63]" />
                {label as string}
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-4 text-[#777a71]">
            Prices and model availability are configuration data and must be
            revalidated before deployment.
          </p>
        </Surface>
      </div>
      <Surface className="overflow-hidden">
        <div className="border-b border-[#e4e5df] p-5">
          <h2 className="text-lg font-semibold">Application-managed routing</h2>
          <p className="mt-1 text-xs text-[#70736a]">
            Native multi-agent orchestration remains disabled behind
            ENABLE_NATIVE_MULTI_AGENT.
          </p>
        </div>
        <div className="grid gap-px bg-[#e5e6e0] md:grid-cols-3">
          {[
            [
              "Extraction & tagging",
              "GPT-5.6 Luna",
              "Fast structured extraction with no action tools",
            ],
            [
              "Routine analysis",
              "GPT-5.6 Terra",
              "Balanced specialist work and structured outputs",
            ],
            [
              "Synthesis & redesign",
              "GPT-5.6 Sol",
              "Committee synthesis, red-team and workflow redesign",
            ],
          ].map(([task, model, detail]) => (
            <div className="bg-white p-5" key={task}>
              <Sparkles className="size-4 text-[#3157d5]" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#777a71]">
                {task}
              </p>
              <p className="mt-2 text-base font-semibold">{model}</p>
              <p className="mt-2 text-xs leading-5 text-[#6d7067]">{detail}</p>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
