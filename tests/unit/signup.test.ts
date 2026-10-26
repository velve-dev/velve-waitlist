import { describe, expect, it, vi } from "vitest";
import { createFormToken } from "@/server/link-tokens";
import { handleSignup } from "@/server/signup";
import { testServices } from "../support/services";

const start = Date.UTC(2026, 9, 18, 9);

function signupRequest(body: Record<string, unknown>, ip = "203.0.113.9") {
  return new Request("https://velve.test/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function setup(env: Record<string, string> = {}) {
  let now = start;
  const services = testServices({ env, now: () => now });
  const formToken = createFormToken(start - 5000, services.config.tokenKey);
  return {
    services,
    formToken,
    advance: (ms: number) => (now += ms),
    send: (body: Record<string, unknown>, ip?: string) =>
      handleSignup(signupRequest({ formToken, ...body }, ip), services),
  };
}

async function snapshot(response: Response) {
  return {
    status: response.status,
    body: await response.text(),
    retryAfter: response.headers.get("retry-after"),
  };
}

describe("handleSignup", () => {
  it("sends one confirmation mail with a link and a greeting", async () => {
    const { services, send } = setup();
    const response = await send({ email: " Alex@Company.com ", name: "Alex" });
    await Promise.all(services.deferred);
    expect(response.status).toBe(200);
    expect(services.brevo.sent).toHaveLength(1);
    const mail = services.brevo.sent[0]!;
    expect(mail.to).toEqual({ email: "alex@company.com" });
    expect(mail.subject).toBe("Confirm your spot on the Velve waitlist");
    expect(mail.subject).not.toContain("Alex");
    expect(mail.text).toContain("Hey Alex,");
    expect(mail.text).toMatch(/https:\/\/velve\.test\/confirm\/[A-Za-z0-9_-]+/);
    expect(services.brevo.listed.size).toBe(0);
  });

  it("drops a spammy first name silently", async () => {
    const { services, send } = setup();
    await send({ email: "j.doe@company.com", name: "Buy now at spam.example" });
    await Promise.all(services.deferred);
    expect(services.brevo.sent[0]?.text).toContain("Hey there,");
    expect(services.brevo.sent[0]?.html).not.toContain("spam.example");
  });

  it("answers new, repeated, honeypot and too-fast sign-ups identically", async () => {
    const { services, send } = setup();
    const fresh = await snapshot(await send({ email: "new@company.com" }, "198.51.100.1"));
    const repeated = await snapshot(await send({ email: "new@company.com" }, "198.51.100.2"));
    const honeypot = await snapshot(
      await send({ email: "bot@company.com", website: "https://spam.example" }, "198.51.100.3"),
    );
    const tooFast = await snapshot(
      await send(
        { email: "fast@company.com", formToken: createFormToken(start, services.config.tokenKey) },
        "198.51.100.4",
      ),
    );
    const noToken = await snapshot(
      await send({ email: "x@company.com", formToken: "" }, "198.51.100.5"),
    );
    expect(repeated).toEqual(fresh);
    expect(honeypot).toEqual(fresh);
    expect(tooFast).toEqual(fresh);
    expect(noToken).toEqual(fresh);
    await Promise.all(services.deferred);
    expect(services.brevo.sent.map((mail) => mail.to.email)).toEqual(["new@company.com"]);
  });

  it("keeps response times for every outcome within noise", async () => {
    const { send } = setup({ SIGNUP_LIMIT_PER_IP: "1000", CONFIRM_MAIL_INTERVAL_SECONDS: "1" });
    const timings: Record<string, number[]> = { fresh: [], repeated: [], honeypot: [] };
    for (let round = 0; round < 30; round += 1) {
      for (const [kind, body] of [
        ["fresh", { email: `user${round}@company.com` }],
        ["repeated", { email: "same@company.com" }],
        ["honeypot", { email: `bot${round}@company.com`, website: "x" }],
      ] as const) {
        const started = performance.now();
        await send(body);
        timings[kind]!.push(performance.now() - started);
      }
    }
    const median = (values: number[]) =>
      [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
    const medians = Object.values(timings).map(median);
    expect(Math.max(...medians) - Math.min(...medians)).toBeLessThan(5);
  });

  it("rejects invalid addresses with the matching problem", async () => {
    const { send } = setup();
    expect(await (await send({ email: "" })).json()).toEqual({ error: "missing" });
    expect(await (await send({ email: "alex.company.com" })).json()).toEqual({ error: "noAt" });
    expect(await (await send({ email: "alex@company" })).json()).toEqual({
      error: "noDomainEnding",
    });
  });

  it("limits sign-ups per network with Retry-After", async () => {
    const { send, advance } = setup();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await send({ email: `a${attempt}@company.com` })).status).toBe(200);
    }
    const limited = await send({ email: "a6@company.com" });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("600");
    expect((await send({ email: "a7@company.com" }, "192.0.2.1")).status).toBe(200);
    advance(600_000);
    expect((await send({ email: "a8@company.com" })).status).toBe(200);
  });

  it("stops everyone once the daily send cap is reached", async () => {
    const { services, send } = setup({ DAILY_SEND_CAP: "2" });
    await send({ email: "one@company.com" }, "192.0.2.10");
    await send({ email: "two@company.com" }, "192.0.2.11");
    const response = await send({ email: "three@company.com" }, "192.0.2.12");
    expect(response.status).toBe(429);
    await Promise.all(services.deferred);
    expect(services.brevo.sent).toHaveLength(2);
  });

  it("never fails the request when the mail cannot be sent", async () => {
    const { services, send } = setup();
    services.brevo.sendMail = () => Promise.reject(new Error("upstream_status_503"));
    expect((await send({ email: "alex@company.com" })).status).toBe(200);
    await Promise.all(services.deferred);
  });

  it("lets the mailbox try again when the confirmation mail could not be sent", async () => {
    const { services, send } = setup();
    const working = services.brevo.sendMail;
    services.brevo.sendMail = () => Promise.reject(new Error("upstream_status_401"));
    await send({ email: "alex@company.com" }, "192.0.2.20");
    await Promise.all(services.deferred);
    services.brevo.sendMail = working;
    await send({ email: "alex@company.com" }, "192.0.2.21");
    await Promise.all(services.deferred);
    expect(services.brevo.sent.map((mail) => mail.to.email)).toEqual(["alex@company.com"]);
  });
});

function streamedRequest(body: ReadableStream<Uint8Array>, ip: string) {
  return new Request("https://velve.test/api/subscribe", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

describe("handleSignup abuse resistance", () => {
  it("counts every address of one IPv6 /64 as the same network", async () => {
    const { send } = setup();
    for (let host = 1; host <= 5; host += 1) {
      const response = await send({ email: `v6-${host}@company.com` }, `2001:db8:1:2::${host}`);
      expect(response.status).toBe(200);
    }
    const limited = await send({ email: "v6-6@company.com" }, "2001:db8:1:2:ffff:1:2:3");
    expect(limited.status).toBe(429);
    expect((await send({ email: "v6-7@company.com" }, "2001:db8:1:3::1")).status).toBe(200);
  });

  it("treats an IPv4-mapped IPv6 address as the IPv4 address", async () => {
    const { send } = setup({ SIGNUP_LIMIT_PER_IP: "1" });
    expect((await send({ email: "m1@company.com" }, "::ffff:192.0.2.7")).status).toBe(200);
    expect((await send({ email: "m2@company.com" }, "192.0.2.7")).status).toBe(429);
  });

  it("sends one mail per mailbox regardless of plus tags and Gmail dots", async () => {
    const { services, send } = setup();
    await send({ email: "victim@company.com" }, "198.51.100.20");
    await send({ email: "victim+1@company.com" }, "198.51.100.21");
    await send({ email: "victim+2@Company.com" }, "198.51.100.22");
    await send({ email: "some.victim@gmail.com" }, "198.51.100.23");
    await send({ email: "somevictim+x@googlemail.com" }, "198.51.100.24");
    await send({ email: "s.o.m.e.victim@gmail.com" }, "198.51.100.25");
    await Promise.all(services.deferred);
    expect(services.brevo.sent.map((mail) => mail.to.email)).toEqual([
      "victim@company.com",
      "some.victim@gmail.com",
    ]);
  });

  it("counts invalid JSON against the network limit", async () => {
    const { services } = setup({ SIGNUP_LIMIT_PER_IP: "2" });
    const garbage = () =>
      new Request("https://velve.test/api/subscribe", {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.30" },
        body: "{not json",
      });
    expect((await handleSignup(garbage(), services)).status).toBe(400);
    expect((await handleSignup(garbage(), services)).status).toBe(400);
    expect((await handleSignup(garbage(), services)).status).toBe(429);
  });

  it("stops reading an oversized body instead of buffering it", async () => {
    const { services } = setup();
    let pulled = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        controller.enqueue(new Uint8Array(1024).fill(32));
      },
    });
    const response = await handleSignup(streamedRequest(endless, "198.51.100.31"), services);
    expect(response.status).toBe(400);
    expect(pulled).toBeLessThan(64);
  }, 5000);

  it("measures the body limit in bytes, not characters", async () => {
    const { services, formToken } = setup();
    const body = JSON.stringify({ email: "big@company.com", formToken, name: "ä".repeat(2100) });
    const request = new Request("https://velve.test/api/subscribe", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.32", "content-type": "application/json" },
      body,
    });
    expect((await handleSignup(request, services)).status).toBe(400);
  });

  it("keeps the address free when the daily cap stops its mail", async () => {
    let now = start;
    const services = testServices({ env: { DAILY_SEND_CAP: "1" }, now: () => now });
    const formToken = createFormToken(start - 5000, services.config.tokenKey);
    let releaseSlowBody: () => void = () => undefined;
    const slowBody = new ReadableStream<Uint8Array>({
      start(controller) {
        releaseSlowBody = () => {
          controller.enqueue(
            new TextEncoder().encode(JSON.stringify({ email: "slow@company.com", formToken })),
          );
          controller.close();
        };
      },
    });
    const slow = handleSignup(streamedRequest(slowBody, "198.51.100.40"), services);
    const fast = await handleSignup(
      signupRequest({ email: "fast@company.com", formToken }, "198.51.100.41"),
      services,
    );
    expect(fast.status).toBe(200);
    releaseSlowBody();
    expect((await slow).status).toBe(429);
    now = Date.UTC(2026, 9, 19, 0, 0, 1);
    const nextDayToken = createFormToken(now - 5000, services.config.tokenKey);
    await handleSignup(
      signupRequest({ email: "slow@company.com", formToken: nextDayToken }, "198.51.100.42"),
      services,
    );
    await Promise.all(services.deferred);
    expect(services.brevo.sent.map((mail) => mail.to.email)).toEqual([
      "fast@company.com",
      "slow@company.com",
    ]);
  });

  it("logs only a stable code when the mail fails", async () => {
    const { services, send } = setup();
    services.brevo.sendMail = () => Promise.reject(new Error("rejected alex@company.com"));
    const lines: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    try {
      await send({ email: "alex@company.com", name: "Alex" });
      await Promise.all(services.deferred);
    } finally {
      spy.mockRestore();
    }
    const output = lines.join("");
    expect(output).toContain("confirm_mail_failed");
    expect(output).not.toMatch(/alex/i);
  });
});

describe("handleSignup from other sites", () => {
  function fromBrowser(
    services: ReturnType<typeof setup>["services"],
    body: Record<string, unknown>,
    headers: Record<string, string>,
    ip: string,
  ) {
    return handleSignup(
      new Request("https://velve.test/api/subscribe", {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8", "x-forwarded-for": ip, ...headers },
        body: JSON.stringify(body),
      }),
      services,
    );
  }

  const sameOrigin = {
    host: "velve.test",
    origin: "https://velve.test",
    "sec-fetch-site": "same-origin",
  };
  const crossSite: Record<string, string>[] = [
    { host: "velve.test", origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    { host: "velve.test", origin: "https://blog.velve.test", "sec-fetch-site": "same-site" },
    { host: "velve.test", "sec-fetch-site": "none" },
    { host: "velve.test", origin: "https://velve.test", "sec-fetch-site": "cross-site" },
    { host: "velve.test", origin: "https://evil.example" },
    { host: "velve.test", origin: "null" },
    { host: "velve.test", origin: "https://velve.test.evil.example" },
    { host: "velve.test", origin: "https://velve.test:8443" },
    { origin: "https://velve.test" },
  ];

  it("answers cross-site sign-ups like any suppressed one and sends nothing", async () => {
    const { services, formToken } = setup({ SIGNUP_LIMIT_PER_IP: "1000" });
    const fresh = await snapshot(
      await fromBrowser(
        services,
        { email: "real@company.com", formToken },
        sameOrigin,
        "198.51.100.50",
      ),
    );
    for (const [index, headers] of crossSite.entries()) {
      const answer = await snapshot(
        await fromBrowser(
          services,
          { email: `victim${index}@company.com`, name: "Victim", formToken },
          headers,
          `198.51.100.${60 + index}`,
        ),
      );
      expect(answer, JSON.stringify(headers)).toEqual(fresh);
    }
    await Promise.all(services.deferred);
    expect(services.brevo.sent.map((mail) => mail.to.email)).toEqual(["real@company.com"]);
  });

  it("answers cross-site sign-ups as fast as accepted ones", async () => {
    const { services, formToken } = setup({
      SIGNUP_LIMIT_PER_IP: "1000",
      CONFIRM_MAIL_INTERVAL_SECONDS: "1",
      DAILY_SEND_CAP: "100000",
    });
    const timings: Record<"accepted" | "crossSite", number[]> = { accepted: [], crossSite: [] };
    for (let round = 0; round < 30; round += 1) {
      for (const [kind, headers] of [
        ["accepted", sameOrigin],
        ["crossSite", crossSite[0]!],
      ] as const) {
        const started = performance.now();
        await fromBrowser(
          services,
          { email: `${kind}${round}@company.com`, formToken },
          headers,
          "198.51.100.51",
        );
        timings[kind].push(performance.now() - started);
      }
    }
    await Promise.all(services.deferred);
    const median = (values: number[]) =>
      [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
    expect(Math.abs(median(timings.accepted) - median(timings.crossSite))).toBeLessThan(5);
    expect(services.brevo.sent.every((mail) => mail.to.email.startsWith("accepted"))).toBe(true);
  });

  it("keeps real visitors on every host working without comparing against SITE_URL", async () => {
    const { services, formToken } = setup();
    const visitors: Record<string, string>[] = [
      { host: "velve.dev", origin: "https://velve.dev" },
      { host: "www.velve.dev", origin: "https://www.velve.dev" },
      { host: "WWW.Velve.dev", origin: "https://www.velve.dev" },
      { host: "127.0.0.1:8674", origin: "http://127.0.0.1:8674" },
      { host: "www.velve.dev", origin: "https://www.velve.dev", "sec-fetch-site": "same-origin" },
      { host: "velve.dev", "sec-fetch-site": "same-origin" },
      {},
    ];
    for (const [index, headers] of visitors.entries()) {
      await fromBrowser(
        services,
        { email: `visitor${index}@company.com`, formToken },
        headers,
        `198.51.100.${80 + index}`,
      );
    }
    await Promise.all(services.deferred);
    expect(services.brevo.sent).toHaveLength(visitors.length);
  });

  it("leaves the mailbox interval and the daily cap to the real visitor", async () => {
    const { services, formToken } = setup({ DAILY_SEND_CAP: "1" });
    await fromBrowser(
      services,
      { email: "alex@company.com", formToken },
      crossSite[0]!,
      "198.51.100.90",
    );
    await fromBrowser(
      services,
      { email: "alex@company.com", formToken },
      crossSite[4]!,
      "198.51.100.91",
    );
    const real = await fromBrowser(
      services,
      { email: "alex@company.com", formToken },
      sameOrigin,
      "198.51.100.92",
    );
    expect(real.status).toBe(200);
    await Promise.all(services.deferred);
    expect(services.brevo.sent.map((mail) => mail.to.email)).toEqual(["alex@company.com"]);
  });

  it("logs a stable code without the address, name, network or token", async () => {
    const { services, formToken } = setup();
    const lines: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    try {
      await fromBrowser(
        services,
        { email: "alex@company.com", name: "Alex", formToken },
        crossSite[0]!,
        "198.51.100.93",
      );
      await Promise.all(services.deferred);
    } finally {
      spy.mockRestore();
    }
    const output = lines.join("");
    expect(output).toContain('"event":"signup_suppressed","code":"cross_site"');
    expect(output).not.toMatch(/alex|198\.51\.100|evil/i);
    expect(output).not.toContain(formToken);
  });
});
