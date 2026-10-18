import { describe, expect, it } from "vitest";
import { publicPath } from "@/lib/analytics";

describe("publicPath", () => {
  it("drops link tokens before anything reaches analytics", () => {
    expect(publicPath("/confirm/abcDEF123_-")).toBe("/confirm");
    expect(publicPath("/unsubscribe/abcDEF123_-")).toBe("/unsubscribe");
  });

  it("keeps ordinary paths", () => {
    expect(publicPath("/")).toBe("/");
    expect(publicPath("/privacy")).toBe("/privacy");
    expect(publicPath("/unsubscribed")).toBe("/unsubscribed");
  });

  it("hides tokens and addresses on paths that miss a route", () => {
    const token = `${"A".repeat(30)}${"_-b9".repeat(10)}`;
    expect(publicPath(`/Confirm/${token}`)).toBe("/Confirm/redacted");
    expect(publicPath(`//confirm/${token}`)).toBe("//confirm/redacted");
    expect(publicPath("/someone@company.com")).toBe("/redacted");
    expect(publicPath("/someone%40company.com/x")).toBe("/redacted/x");
  });
});
