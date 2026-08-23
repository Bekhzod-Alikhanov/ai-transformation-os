import type { ApprovalRevision } from "@/modules/approvals/approval-service";
import type {
  ConnectorAdapter,
  ExternalAction,
  SyncCursor,
} from "@/lib/domain/contracts";

export class DisabledConnectorAdapter implements ConnectorAdapter {
  readonly capabilities = [] as const;
  constructor(
    readonly id: string,
    private readonly reason: string,
  ) {}
  async sync(
    cursor?: SyncCursor,
  ): Promise<{ cursor: SyncCursor; items: unknown[] }> {
    void cursor;
    throw new Error(`${this.id} is disabled: ${this.reason}`);
  }
  async propose(action: ExternalAction): Promise<ApprovalRevision> {
    void action;
    throw new Error(`${this.id} is disabled: ${this.reason}`);
  }
  async execute(
    action: ExternalAction & { approvalId: string; payloadHash: string },
  ): Promise<{ externalId: string; executedAt: string }> {
    void action;
    throw new Error(`${this.id} is disabled: ${this.reason}`);
  }
}
