import { workspaceSchema, type Workspace } from "./types";

const DATABASE_NAME = "beck-assessment-workbench";
const DATABASE_VERSION = 1;
const STORE_NAME = "workspace";
const ACTIVE_KEY = "active";
const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export interface AssessmentRepository {
  load(): Promise<Workspace | null>;
  save(next: Workspace, expectedRevision: number | null): Promise<Workspace>;
  close(): void;
}

export class StaleWorkspaceError extends Error {
  constructor(
    public readonly expectedRevision: number | null,
    public readonly actualRevision: number | null,
  ) {
    super(
      `The assessment changed in another tab (expected revision ${expectedRevision ?? "none"}, found ${actualRevision ?? "none"}). Reload the saved workspace before deciding whether to reapply unsaved edits.`,
    );
    this.name = "StaleWorkspaceError";
  }
}

export class CorruptWorkspaceError extends Error {
  constructor(
    message: string,
    public readonly rawBackup: string | null,
  ) {
    super(message);
    this.name = "CorruptWorkspaceError";
  }
}

function rawBackup(value: unknown): string | null {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

function validateStored(value: unknown): Workspace {
  const parsed = workspaceSchema.safeParse(value);
  if (!parsed.success)
    throw new CorruptWorkspaceError(
      "The saved assessment is not a valid version 2 workspace. Export the raw backup before restoring or repairing it; the stored record has not been changed.",
      rawBackup(value),
    );
  return parsed.data;
}

function transactionMessage(action: string, error: DOMException | null) {
  const detail = error?.message ? ` (${error.message})` : "";
  return `IndexedDB could not ${action}${detail}. The previous saved workspace is unchanged. Check browser storage permissions and reconnect by reopening the workbench.`;
}

export function serializeBackup(workspace: Workspace): string {
  return JSON.stringify(workspaceSchema.parse(workspace), null, 2);
}

export function parseBackup(text: string): Workspace {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
    throw new Error(
      "Backup exceeds the 20 MiB safety limit. Keep the original backup and reduce unrelated embedded content before trying again.",
    );
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "Backup is not valid JSON. Keep the original file and choose an unmodified version 2 assessment backup.",
    );
  }
  const version =
    value && typeof value === "object" && "schemaVersion" in value
      ? (value as { schemaVersion?: unknown }).schemaVersion
      : undefined;
  if (version !== 2)
    throw new Error(
      `Backup version ${String(version ?? "missing")} is not supported. This workbench accepts version 2; keep the original backup for recovery or migration.`,
    );
  const parsed = workspaceSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      `Backup validation failed and nothing was restored: ${parsed.error.issues.map((issue) => issue.message).join("; ")}. Keep the original backup for recovery.`,
    );
  return parsed.data;
}

export function openRepository(): Promise<AssessmentRepository> {
  if (typeof indexedDB === "undefined")
    return Promise.reject(
      new Error(
        "IndexedDB is unavailable. Check browser settings for blocked site storage, then reopen the workbench; no in-memory replacement was used.",
      ),
    );

  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    const openingError = (error: unknown) =>
      new Error(
        `IndexedDB could not open${error instanceof Error ? ` (${error.message})` : ""}. Check browser storage permissions and reopen the workbench.`,
      );
    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch (error) {
      reject(openingError(error));
      return;
    }
    let settled = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME))
        request.result.createObjectStore(STORE_NAME);
    };
    request.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          "IndexedDB opening is blocked by another tab. Close other workbench tabs, then reopen this one; no saved record was changed.",
        ),
      );
    };
    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(openingError(request.error));
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      const database = request.result;
      let closed = false;
      database.onversionchange = () => {
        closed = true;
        database.close();
      };

      const ensureOpen = () => {
        if (closed)
          throw new Error(
            "The assessment database connection was closed for an upgrade. Reopen the workbench to reconnect before loading or saving.",
          );
      };

      resolve({
        load() {
          try {
            ensureOpen();
          } catch (error) {
            return Promise.reject(error);
          }
          return new Promise((loadResolve, loadReject) => {
            let transaction: IDBTransaction;
            try {
              transaction = database.transaction(STORE_NAME, "readonly");
            } catch (error) {
              loadReject(
                new Error(
                  transactionMessage(
                    "start reading the saved workspace",
                    error instanceof DOMException ? error : null,
                  ),
                ),
              );
              return;
            }
            const get = transaction.objectStore(STORE_NAME).get(ACTIVE_KEY);
            let result: Workspace | null = null;
            let logicalError: unknown;
            get.onsuccess = () => {
              try {
                result =
                  get.result === undefined ? null : validateStored(get.result);
              } catch (error) {
                logicalError = error;
                transaction.abort();
              }
            };
            get.onerror = (event) => {
              event.preventDefault();
              logicalError = new Error(
                transactionMessage("read the saved workspace", get.error),
              );
              transaction.abort();
            };
            transaction.oncomplete = () => loadResolve(result);
            transaction.onabort = () =>
              loadReject(
                logicalError ??
                  new Error(
                    transactionMessage(
                      "finish reading the saved workspace",
                      transaction.error,
                    ),
                  ),
              );
            transaction.onerror = () => {
              logicalError ??= new Error(
                transactionMessage(
                  "read the saved workspace",
                  transaction.error,
                ),
              );
            };
          });
        },
        save(next, expectedRevision) {
          let validated: Workspace;
          try {
            ensureOpen();
            validated = workspaceSchema.parse(next);
          } catch (error) {
            return Promise.reject(error);
          }
          return new Promise((saveResolve, saveReject) => {
            let transaction: IDBTransaction;
            try {
              transaction = database.transaction(STORE_NAME, "readwrite");
            } catch (error) {
              saveReject(
                new Error(
                  transactionMessage(
                    "start saving the workspace",
                    error instanceof DOMException ? error : null,
                  ),
                ),
              );
              return;
            }
            const store = transaction.objectStore(STORE_NAME);
            const get = store.get(ACTIVE_KEY);
            let saved: Workspace | undefined;
            let logicalError: unknown;
            get.onsuccess = () => {
              try {
                const current =
                  get.result === undefined ? null : validateStored(get.result);
                const actualRevision = current?.revision ?? null;
                if (actualRevision !== expectedRevision) {
                  logicalError = new StaleWorkspaceError(
                    expectedRevision,
                    actualRevision,
                  );
                  transaction.abort();
                  return;
                }
                saved = workspaceSchema.parse({
                  ...validated,
                  revision: (current?.revision ?? 0) + 1,
                });
                const put = store.put(saved, ACTIVE_KEY);
                put.onerror = (event) => {
                  event.preventDefault();
                  logicalError = new Error(
                    transactionMessage("save the workspace", put.error),
                  );
                  transaction.abort();
                };
              } catch (error) {
                logicalError = error;
                transaction.abort();
              }
            };
            get.onerror = (event) => {
              event.preventDefault();
              logicalError = new Error(
                transactionMessage("check the saved revision", get.error),
              );
              transaction.abort();
            };
            transaction.oncomplete = () => saveResolve(saved!);
            transaction.onabort = () =>
              saveReject(
                logicalError ??
                  new Error(
                    transactionMessage(
                      "finish saving the workspace",
                      transaction.error,
                    ),
                  ),
              );
            transaction.onerror = () => {
              logicalError ??= new Error(
                transactionMessage("save the workspace", transaction.error),
              );
            };
          });
        },
        close() {
          if (closed) return;
          closed = true;
          database.close();
        },
      });
    };
  });
}
