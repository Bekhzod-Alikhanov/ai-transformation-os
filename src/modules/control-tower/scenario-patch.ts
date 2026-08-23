import { z } from "zod";

const patchSchema = z.object({
  intent: z.enum(["temporary_scenario", "persistent_scenario_change"]),
  patch: z
    .object({
      labourBenefitMultiplier: z.number().min(0).max(2).optional(),
      adoption: z.number().min(0).max(1).optional(),
      operatingCostMultiplier: z.number().min(0).max(3).optional(),
    })
    .refine(
      (value) => Object.keys(value).length === 1,
      "Exactly one scenario variable is required",
    ),
  requiresApproval: z.boolean(),
});

export type ScenarioPatch = z.infer<typeof patchSchema>;

export const ScenarioPatchService = {
  parse(command: string): ScenarioPatch {
    const normalized = command.trim().toLowerCase();
    const percentage = normalized.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
    const amount = percentage ? Number(percentage[1]) / 100 : null;
    const persistent = /save|persist|update the base|change the base/.test(
      normalized,
    );
    const base = {
      intent: persistent
        ? ("persistent_scenario_change" as const)
        : ("temporary_scenario" as const),
      requiresApproval: persistent,
    };

    if (amount !== null && /labou?r|capacity|time saving/.test(normalized)) {
      const isLower = /lower|less|reduce|down|decrease/.test(normalized);
      return patchSchema.parse({
        ...base,
        patch: { labourBenefitMultiplier: isLower ? 1 - amount : 1 + amount },
      });
    }
    if (amount !== null && /adoption|usage/.test(normalized)) {
      return patchSchema.parse({ ...base, patch: { adoption: amount } });
    }
    if (amount !== null && /operating cost|run cost/.test(normalized)) {
      const isLower = /lower|less|reduce|down|decrease/.test(normalized);
      return patchSchema.parse({
        ...base,
        patch: { operatingCostMultiplier: isLower ? 1 - amount : 1 + amount },
      });
    }

    throw new Error(
      "No supported scenario variable was found. Try labour benefit, adoption, or operating cost with a percentage.",
    );
  },
};
