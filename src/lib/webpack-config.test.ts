import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

const { webpack } = createRequire(import.meta.url)(
  "next/dist/compiled/webpack/webpack",
);
type IgnorePlugin = {
  checkIgnore: (input: {
    request: string;
    context: string;
  }) => false | undefined;
};
describe("PptxGenJS browser-only built-ins", () => {
  it("ignores only its declared fs/https browser exclusions, including Windows package paths", () => {
    const config = nextConfig.webpack!({ plugins: [] }, {
      isServer: false,
      webpack,
    } as never);
    const plugin = config.plugins[0] as IgnorePlugin;
    for (const context of [
      "/app/node_modules/pptxgenjs/dist",
      "C:\\app\\node_modules\\pptxgenjs\\dist",
    ])
      for (const request of ["node:fs", "node:https"])
        expect(plugin.checkIgnore({ request, context })).toBe(false);
    expect(
      plugin.checkIgnore({
        request: "node:fs",
        context: "/app/node_modules/other/dist",
      }),
    ).toBeUndefined();
    expect(
      plugin.checkIgnore({
        request: "node:path",
        context: "/app/node_modules/pptxgenjs/dist",
      }),
    ).toBeUndefined();
    expect(
      plugin.checkIgnore({
        request: "node:fs",
        context: "/app/node_modules/pptxgenjs-other/dist",
      }),
    ).toBeUndefined();
  });
  it("retains Node built-in behavior for the server build", () => {
    const config = nextConfig.webpack!({ plugins: [] }, {
      isServer: true,
      webpack,
    } as never);
    expect(config.plugins).toEqual([]);
  });
});
