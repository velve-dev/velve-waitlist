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
});
