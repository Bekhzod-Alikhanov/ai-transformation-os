export function nativeMultiAgentEnabled() {
  return process.env.ENABLE_NATIVE_MULTI_AGENT === "true";
}

export async function runNativeMultiAgent(): Promise<never> {
  if (!nativeMultiAgentEnabled())
    throw new Error(
      "Native multi-agent is disabled; use application-managed orchestration",
    );
  throw new Error(
    "Native multi-agent beta adapter is intentionally not enabled in this release",
  );
}
