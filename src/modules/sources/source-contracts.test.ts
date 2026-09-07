import { expectTypeOf, test } from "vitest";
import type {
  AgentEvent,
  AuditEvent,
  OpportunityDraft,
  SourceItem,
} from "./source-types";

test("public contracts match persisted nullable and event rows", () => {
  expectTypeOf<SourceItem["content"]>().toEqualTypeOf<string | null>();
  expectTypeOf<AgentEvent>().toMatchTypeOf<{ payload: unknown }>();
  expectTypeOf<AuditEvent>().toMatchTypeOf<{
    targetType: string;
    targetId: string;
    payloadHash: string | null;
    metadata: unknown;
  }>();
  expectTypeOf<OpportunityDraft>().toMatchTypeOf<{
    evidence: Array<{ evidenceId: string }>;
  }>();
});
