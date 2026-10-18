import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { relayEvent, serveTrackerScript } from "@/server/umami";

const saved = { url: process.env.UMAMI_URL, id: process.env.UMAMI_WEBSITE_ID };

function restore(key: "UMAMI_URL" | "UMAMI_WEBSITE_ID", value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  restore("UMAMI_URL", saved.url);
  restore("UMAMI_WEBSITE_ID", saved.id);
});

describe("umami relay", () => {
  describe("without configuration", () => {
    beforeEach(() => {
      delete process.env.UMAMI_URL;
      delete process.env.UMAMI_WEBSITE_ID;
    });

    it("serves nothing", async () => {
      expect((await serveTrackerScript()).status).toBe(404);
      const request = new Request("https://velve.test/stats/api/send", {
        method: "POST",
        body: "{}",
      });
      expect((await relayEvent(request)).status).toBe(404);
    });
  });

  it("refuses oversized events before contacting Umami", async () => {
    process.env.UMAMI_URL = "http://127.0.0.1:1";
    process.env.UMAMI_WEBSITE_ID = "site";
    const request = new Request("https://velve.test/stats/api/send", {
      method: "POST",
      body: "x".repeat(17 * 1024),
    });
    expect((await relayEvent(request)).status).toBe(413);
  });
});
