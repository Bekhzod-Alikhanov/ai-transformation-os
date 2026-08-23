# P2 extension contracts

P2 work must enter through stable interfaces rather than provider-specific branches in business logic.

## Provider adapter checklist

1. Declare a unique ID and the smallest truthful `ConnectorCapability[]`.
2. Implement cursor-based, idempotent `sync` with source-native locators and deletion semantics.
3. Turn every persistent or external action into an immutable `ApprovalRevision` through `propose`.
4. In `execute`, reload the approved revision, verify tenant, actor, permission, expiry, policy, payload hash, and idempotency key, then pass the exact reviewed payload.
5. Store credentials only in AES-256-GCM versioned envelopes. Never emit secrets or content to logs.
6. Add mocked contract tests, configured test-account journeys, forged-webhook tests, and pgTAP tenant checks.

## Enterprise MCP

Generic MCP execution is disabled. A future adapter must use an explicit allow-list of servers and tools, bind each server to an organisation, classify tool effects, require approval for persistent/external effects, constrain schemas, and record an immutable execution receipt. Installing or detecting an MCP server must never make it appear connected or trusted automatically.

## Additional model providers

A model provider adapter must return the same structured `AgentRunResult<TOutput>`, support Zod validation, expose latency/token/cost metadata, prohibit private reasoning storage, and pass the fixed Model Lab evaluation suite. Provider availability and prices remain configuration with effective dates.
