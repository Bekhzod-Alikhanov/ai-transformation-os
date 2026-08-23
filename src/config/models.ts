export type ModelTask =
  | "extraction"
  | "tagging"
  | "structured_analysis"
  | "committee_synthesis"
  | "red_team"
  | "workflow_redesign";

export type ModelConfig = {
  id: "gpt-5.6-luna" | "gpt-5.6-terra" | "gpt-5.6-sol";
  effort: "low" | "medium" | "high";
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
  pricingEffectiveDate: string;
  enabled: boolean;
};

export const modelCatalog = {
  luna: {
    id: "gpt-5.6-luna",
    effort: "low",
    inputUsdPerMillionTokens: 0,
    outputUsdPerMillionTokens: 0,
    pricingEffectiveDate: "2026-08-22",
    enabled: true,
  },
  terra: {
    id: "gpt-5.6-terra",
    effort: "medium",
    inputUsdPerMillionTokens: 0,
    outputUsdPerMillionTokens: 0,
    pricingEffectiveDate: "2026-08-22",
    enabled: true,
  },
  sol: {
    id: "gpt-5.6-sol",
    effort: "high",
    inputUsdPerMillionTokens: 0,
    outputUsdPerMillionTokens: 0,
    pricingEffectiveDate: "2026-08-22",
    enabled: true,
  },
} satisfies Record<string, ModelConfig>;

export function routeModel(task: ModelTask): ModelConfig {
  if (task === "extraction" || task === "tagging") return modelCatalog.luna;
  if (task === "structured_analysis") return modelCatalog.terra;
  return modelCatalog.sol;
}

export function estimateModelCost(
  model: ModelConfig,
  inputTokens: number,
  outputTokens: number,
) {
  return Number(
    (
      (inputTokens / 1_000_000) * model.inputUsdPerMillionTokens +
      (outputTokens / 1_000_000) * model.outputUsdPerMillionTokens
    ).toFixed(6),
  );
}
