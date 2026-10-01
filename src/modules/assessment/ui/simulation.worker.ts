import { simulateOption, type SimulationRanges } from "../economics";
import type { SolutionOption, SimulationSummary } from "../types";
export type SimulationRequest = {
  option: SolutionOption;
  bau: SolutionOption;
  seed: number;
  ranges: SimulationRanges;
};
export type SimulationResponse =
  { ok: true; summary: SimulationSummary } | { ok: false; error: string };
self.onmessage = (event: MessageEvent<SimulationRequest>) => {
  try {
    const { option, bau, seed, ranges } = event.data;
    self.postMessage({
      ok: true,
      summary: simulateOption(option, bau, seed, ranges),
    } satisfies SimulationResponse);
  } catch (error) {
    self.postMessage({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Simulation failed safely; check inputs and ranges.",
    } satisfies SimulationResponse);
  }
};
