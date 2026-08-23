"use client";

import { Check, Clock3, Plus, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { automations } from "@/modules/demo/aster-data";

export function AutomationStudio() {
  const [building, setBuilding] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
      <Surface className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e4e5df] p-5">
          <div>
            <h2 className="text-lg font-semibold">Active recipes</h2>
            <p className="mt-1 text-xs text-[#70736a]">
              Durable Inngest workflows with constrained triggers and actions.
            </p>
          </div>
          <Button onClick={() => setBuilding(true)} size="sm">
            <Plus className="size-3.5" />
            New recipe
          </Button>
        </div>
        <div className="divide-y divide-[#e7e8e2]">
          {automations.map((recipe) => (
            <div className="p-5" key={recipe.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded bg-[#e9edf9] text-[#3157d5]">
                      <Zap className="size-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold">{recipe.name}</h3>
                    <Badge tone="value">Active</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <Badge>WHEN</Badge>
                    <span>{recipe.trigger}</span>
                    <span className="text-[#aaa]">→</span>
                    <Badge>IF</Badge>
                    <span>{recipe.condition}</span>
                    <span className="text-[#aaa]">→</span>
                    <Badge tone="action">THEN</Badge>
                    <span>{recipe.action}</span>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#8a641b]">
                    <ShieldCheck className="size-3" />
                    {recipe.approval}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#777a71]">Last run</p>
                  <p className="mt-1 text-xs font-semibold">{recipe.lastRun}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Surface>
      <aside>
        {building ? (
          <Surface className="overflow-hidden">
            <div className="border-b border-[#e4e5df] p-5">
              <h2 className="text-sm font-semibold">
                Constrained recipe builder
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#70736a]">
                Choose from validated WHEN / IF / THEN / APPROVAL primitives.
              </p>
            </div>
            <div className="space-y-4 p-5">
              {[
                [
                  "WHEN",
                  "Every Monday at 08:00",
                  [
                    "Every Monday at 08:00",
                    "New approved evidence",
                    "Pilot KPI updated",
                  ],
                ],
                [
                  "IF",
                  "Active pilot is below gate",
                  [
                    "Active pilot is below gate",
                    "Confidence changed ≥ 10%",
                    "Decision is due in 48 hours",
                  ],
                ],
                [
                  "THEN",
                  "Draft value review",
                  [
                    "Draft value review",
                    "Recalculate portfolio",
                    "Create owner task",
                  ],
                ],
                [
                  "APPROVAL",
                  "Required before publishing",
                  [
                    "Required before publishing",
                    "Required before task creation",
                    "Notify only",
                  ],
                ],
              ].map(([label, defaultValue, options]) => (
                <label className="block" key={String(label)}>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#777a71]">
                    {label as string}
                  </span>
                  <select
                    className="h-10 w-full rounded-md border border-[#d9dad4] bg-white px-3 text-xs"
                    defaultValue={defaultValue as string}
                  >
                    {(options as string[]).map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              ))}
              <Button
                className="w-full"
                onClick={() => setSaved(true)}
                size="sm"
              >
                <Check className="size-3.5" />
                Validate and save
              </Button>
              {saved ? (
                <p
                  aria-live="polite"
                  className="flex items-center gap-2 rounded-md bg-[#eef8f4] p-3 text-xs font-semibold text-[#176c59]"
                >
                  <Check className="size-3.5" />
                  Recipe schema valid and saved as draft
                </p>
              ) : null}
            </div>
          </Surface>
        ) : (
          <Surface className="p-5">
            <Sparkles className="size-5 text-[#3157d5]" />
            <h2 className="mt-3 text-sm font-semibold">Automation policy</h2>
            <p className="mt-2 text-xs leading-5 text-[#6d7067]">
              Recipes can query, calculate, draft, notify, or propose. They
              cannot run arbitrary code or bypass approval.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <p className="flex items-center gap-2">
                <Check className="size-3.5 text-[#21806a]" />
                Validated event inputs
              </p>
              <p className="flex items-center gap-2">
                <Clock3 className="size-3.5 text-[#21806a]" />
                Durable retries and idempotency
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-[#21806a]" />
                External effects require approval
              </p>
            </div>
          </Surface>
        )}
      </aside>
    </div>
  );
}
