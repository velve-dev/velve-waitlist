import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  describe("with an unreachable Umami", () => {
    beforeEach(() => {
      process.env.UMAMI_URL = "http://127.0.0.1:1";
      process.env.UMAMI_WEBSITE_ID = "site";
    });

    function eventRequest(payload: Record<string, unknown>, type = "event") {
      return new Request("https://velve.test/stats/api/send", {
        method: "POST",
        body: JSON.stringify({ type, payload: { website: "site", url: "/", ...payload } }),
      });
    }

    async function loggedWhile(run: () => Promise<unknown>): Promise<string> {
      const lines: string[] = [];
      const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
        lines.push(String(chunk));
        return true;
      });
      try {
        await run();
      } finally {
        spy.mockRestore();
      }
      return lines.join("");
    }

    it("refuses events other than page views and the two sign-up events", async () => {
      for (const request of [
        eventRequest({ name: "clicked_anything" }),
        eventRequest({ name: "signup_submitted", data: { email: "alex@company.com" } }),
        eventRequest({}, "identify"),
        new Request("https://velve.test/stats/api/send", { method: "POST", body: "not json" }),
      ]) {
        expect((await relayEvent(request)).status).toBe(400);
      }
    });

    it("relays allowed events and logs only a stable code when Umami is down", async () => {
      let status = 0;
      const output = await loggedWhile(async () => {
        status = (await relayEvent(eventRequest({ name: "signup_confirmed" }))).status;
        expect((await relayEvent(eventRequest({}))).status).toBe(502);
        expect((await serveTrackerScript()).status).toBe(503);
      });
      expect(status).toBe(502);
      const codes = output
        .trim()
        .split("\n")
        .map((line) => (JSON.parse(line) as { code?: string }).code);
      expect(codes).toEqual([
        "analytics_send_failed",
        "analytics_send_failed",
        "analytics_script_failed",
      ]);
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
