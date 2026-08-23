import { describe, expect, it } from "vitest";

import { generateDecisionBrief } from "./brief-document";
import { generateSteeringPack } from "./steering-pack";

describe("executive exports", () => {
  it("renders a valid PDF decision brief", async () => {
    const bytes = await generateDecisionBrief();

    expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(5_000);
  });

  it("renders an Office Open XML steering pack", async () => {
    const bytes = await generateSteeringPack();

    expect(bytes.subarray(0, 2).toString("ascii")).toBe("PK");
    expect(bytes.length).toBeGreaterThan(10_000);
  });
});
