import { describe, expect, it } from "vitest";

import { mapIngestionSourceQueue } from "./evidence-workbench-data.server";

describe("evidence workbench ingestion queue", () => {
  it("shows organisation-scoped ingestion work even when it has no candidates", () => {
    expect(
      mapIngestionSourceQueue([
        {
          id: "ingestion-1",
          status: "parsing",
          sources: { id: "source-1", name: "Operations baseline.pdf" },
        },
        {
          id: "ingestion-2",
          status: "completed",
          sources: { id: "source-2", name: "Completed notes.txt" },
        },
      ]),
    ).toEqual([
      {
        id: "ingestion-1",
        sourceName: "Operations baseline.pdf",
        sourceStatus: "parsing",
      },
    ]);
  });

  it("keeps actionable source lifecycle states visible when the latest run is completed", () => {
    expect(
      mapIngestionSourceQueue([
        {
          id: "ingestion-queued",
          status: "completed",
          sources: {
            id: "source-queued",
            name: "Queued.pdf",
            status: "queued",
          },
        },
        {
          id: "ingestion-failed",
          status: "completed",
          sources: {
            id: "source-failed",
            name: "Failed.pdf",
            status: "failed",
          },
        },
        {
          id: "ingestion-ready",
          status: "completed",
          sources: { id: "source-ready", name: "Ready.pdf", status: "ready" },
        },
      ]),
    ).toEqual([
      {
        id: "ingestion-queued",
        sourceName: "Queued.pdf",
        sourceStatus: "queued",
      },
      {
        id: "ingestion-failed",
        sourceName: "Failed.pdf",
        sourceStatus: "failed",
      },
    ]);
  });
});
