import { describe, expect, it } from "vitest";
import { pendingLegalReview } from "@/content/legal";
import { siteIsIndexable } from "@/server/indexing";
import { pagePolicy } from "@/server/security-headers";

describe("siteIsIndexable", () => {
  it("stays off by default", () => {
    expect(siteIsIndexable({})).toBe(false);
  });

  it("stays off while legal texts await review, even when switched on", () => {
    expect(pendingLegalReview.length).toBeGreaterThan(0);
    expect(siteIsIndexable({ SITE_INDEXABLE: "true" })).toBe(false);
  });
});

describe("pagePolicy", () => {
  it("allows only nonce scripts and upgrades insecure requests on https", () => {
    const policy = pagePolicy("abc", { development: false, https: true });
    expect(policy).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("unsafe");
  });

  it("allows eval only in development", () => {
    expect(pagePolicy("abc", { development: true, https: false })).toContain("'unsafe-eval'");
  });
});
