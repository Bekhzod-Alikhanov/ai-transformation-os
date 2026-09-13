import { simulateEconomics, type EconomicInput } from "./economics";
self.onmessage = (
  event: MessageEvent<{ input: EconomicInput; seed: number }>,
) => {
  try {
    self.postMessage({
      result: simulateEconomics(event.data.input, event.data.seed),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Simulation failed.",
    });
  }
};
