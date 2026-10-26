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

describe("umami relay with a reachable Umami", () => {
  beforeEach(() => {
    process.env.UMAMI_URL = "http://umami.internal";
    process.env.UMAMI_WEBSITE_ID = "velve-site";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function pageView(website: unknown) {
    return new Request("https://velve.test/stats/api/send", {
      method: "POST",
      body: JSON.stringify({ type: "event", payload: { website, url: "/" } }),
    });
  }

  function upstreamAnswers(body: string, status: number) {
    return vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } }),
      );
  }

  it("refuses events for every website but ours without contacting Umami", async () => {
    const upstream = upstreamAnswers('{"cache":"c"}', 200);
    for (const website of ["another-site", "", undefined, 42, "VELVE-SITE", " velve-site"]) {
      expect((await relayEvent(pageView(website))).status, String(website)).toBe(400);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it("passes a successful Umami answer through unchanged", async () => {
    const upstream = upstreamAnswers('{"cache":"session-cache"}', 200);
    const response = await relayEvent(pageView("velve-site"));
    expect(upstream).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"cache":"session-cache"}');
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("hides what Umami says when it refuses an event", async () => {
    for (const status of [400, 403, 404, 429, 500, 503]) {
      upstreamAnswers(`upstream detail ${status} from db-01.internal`, status);
      const lines: string[] = [];
      const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
        lines.push(String(chunk));
        return true;
      });
      let response: Response;
      try {
        response = await relayEvent(pageView("velve-site"));
      } finally {
        spy.mockRestore();
      }
      expect(response.status, String(status)).toBe(502);
      expect(await response.text(), String(status)).toBe("");
      expect(response.headers.get("cache-control")).toBe("no-store");
      const output = lines.join("");
      expect(output).not.toContain("db-01");
      expect((JSON.parse(output.trim()) as { event: string; code: string }).code).toBe(
        "analytics_send_rejected",
      );
      vi.restoreAllMocks();
    }
  });
});
