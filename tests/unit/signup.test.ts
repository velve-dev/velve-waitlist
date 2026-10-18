import { describe, expect, it } from "vitest";
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
});
