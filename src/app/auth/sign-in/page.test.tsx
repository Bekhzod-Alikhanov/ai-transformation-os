import { expect, it, vi } from "vitest";

import SignInPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT:/demo");
  }),
}));

it("sends the legacy sign-in URL to the public replay", () => {
  expect(() => SignInPage()).toThrow("NEXT_REDIRECT:/demo");
});
