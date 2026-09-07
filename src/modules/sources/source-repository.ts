import type {
  ExecutionReceipt,
  IngestionRun,
  Source,
  SourceItem,
} from "./source-types";

export type CreateSourceRecord = Source;

export type PersistedSourceCompletion = {
  source: Pick<
    Source,
    | "status"
    | "actualSha256"
    | "actualSizeBytes"
    | "actualMimeType"
    | "completedAt"
  >;
  items: SourceItem[];
  run: IngestionRun;
};

export type CompletionResult = { source: Source; replayed: boolean };

export interface SourceRepository {
  readonly organisationId: string;
  create(record: CreateSourceRecord): Promise<Source>;
  deleteAwaitingUpload(sourceId: string): Promise<boolean>;
  get(sourceId: string): Promise<Source | null>;
  beginIngestion(
    sourceId: string,
    run: IngestionRun,
  ): Promise<IngestionRun | null>;
  findPurgeReceipt(sourceId: string): Promise<ExecutionReceipt | null>;
  transition(
    sourceId: string,
    expected: Source["status"],
    next: Source["status"],
  ): Promise<Source | null>;
  fail(
    sourceId: string,
    errorCode: string,
    runId?: string,
  ): Promise<Source | null>;
  completeUpload(
    sourceId: string,
    completion: PersistedSourceCompletion,
  ): Promise<CompletionResult | null>;
  purge(
    sourceId: string,
    receipt: ExecutionReceipt,
  ): Promise<ExecutionReceipt | null>;
}
