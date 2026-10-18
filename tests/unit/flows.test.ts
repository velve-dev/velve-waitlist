import { describe, expect, it } from "vitest";
import { confirmSignup } from "@/server/confirm";
import {
  createConfirmToken,
  createUnsubscribeToken,
  readUnsubscribeToken,
} from "@/server/link-tokens";
import { handleBrevoWebhook, handleUnsubscribe } from "@/server/unsubscribe";
import { testEnv, testServices } from "../support/services";

const signedUpAt = Date.UTC(2026, 9, 18, 9);
const confirmedAt = Date.UTC(2026, 9, 19, 12);

function setup(env: Record<string, string> = {}) {
  const services = testServices({ env, now: () => confirmedAt });
  const token = (firstName = "Alex", email = "alex@company.com") =>
    createConfirmToken(
      { email, firstName, signedUpAt, consentVersion: "2026-10-18" },
      services.config.tokenKey,
    );
  return { services, token };
}

describe("confirmSignup", () => {
  it("lists the contact with the agreed attributes and sends a welcome", async () => {
    const { services, token } = setup();
    expect(await confirmSignup(token(), services)).toEqual({
      kind: "confirmed",
      firstName: "Alex",
    });
    expect(services.brevo.listed.get("alex@company.com")).toEqual({
      FIRSTNAME: "Alex",
      GREETING: "Alex",
      SIGNUP_AT: "2026-10-18",
      CONFIRMED_AT: "2026-10-19",
      CONSENT_VERSION: "2026-10-18",
    });
    await Promise.all(services.deferred);
    const welcome = services.brevo.sent[0]!;
    expect(welcome.subject).toBe("You're on the Velve waitlist");
    const unsubscribePath = /https:\/\/velve\.test\/unsubscribe\/([A-Za-z0-9_-]+)/.exec(
      welcome.text,
    );
    expect(readUnsubscribeToken(unsubscribePath?.[1] ?? "", services.config.tokenKey)).toBe(
      "alex@company.com",
    );
  });

  it("omits the first name when none was given", async () => {
    const { services, token } = setup();
    await confirmSignup(token("", "julius@company.com"), services);
    expect(services.brevo.listed.get("julius@company.com")).not.toHaveProperty("FIRSTNAME");
    expect(services.brevo.listed.get("julius@company.com")).toHaveProperty("GREETING", "Julius");
  });

  it("answers a second click without writing or mailing again", async () => {
    const { services, token } = setup();
    await confirmSignup(token(), services);
    await Promise.all(services.deferred);
    expect(await confirmSignup(token(), services)).toEqual({ kind: "alreadyListed" });
    await Promise.all(services.deferred);
    expect(services.brevo.sent).toHaveLength(1);
  });

  it("rejects broken and expired links without touching Brevo", async () => {
    const { services, token } = setup({ CONFIRM_TOKEN_TTL_SECONDS: "3600" });
    expect(await confirmSignup("broken", services)).toEqual({ kind: "invalidLink" });
    expect(await confirmSignup(token(), services)).toEqual({ kind: "invalidLink" });
    expect(services.brevo.listed.size).toBe(0);
  });

  it("skips the welcome mail once the daily cap is used up", async () => {
    const { services, token } = setup({ DAILY_SEND_CAP: "1" });
    services.sendCap.take(confirmedAt);
    expect((await confirmSignup(token(), services)).kind).toBe("confirmed");
    await Promise.all(services.deferred);
    expect(services.brevo.sent).toHaveLength(0);
  });
});

describe("handleUnsubscribe", () => {
  it("deletes the contact behind a valid link", async () => {
    const { services } = setup();
    services.brevo.listed.set("alex@company.com", {});
    const token = createUnsubscribeToken("alex@company.com", services.config.tokenKey);
    const response = await handleUnsubscribe(token, services);
    expect(response.status).toBe(200);
    expect(services.brevo.deleted).toEqual(["alex@company.com"]);
  });

  it("refuses a broken link without saying why", async () => {
    const { services } = setup();
    const response = await handleUnsubscribe("broken", services);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_link" });
    expect(services.brevo.deleted).toEqual([]);
  });
});

describe("handleBrevoWebhook", () => {
  function webhook(body: unknown, secret = testEnv.BREVO_WEBHOOK_SECRET) {
    return new Request("https://velve.test/api/webhooks/brevo", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("deletes contacts that unsubscribed through Brevo", async () => {
    const { services } = setup();
    const response = await handleBrevoWebhook(
      webhook([
        { event: "unsubscribe", email: "Alex@Company.com", camp_id: 1 },
        { event: "unsubscribed", email: "sam@company.com" },
        { event: "opened", email: "kim@company.com" },
        { event: "unsubscribe", email: "not-an-address" },
      ]),
      services,
    );
    expect(response.status).toBe(200);
    expect(services.brevo.deleted).toEqual(["alex@company.com", "sam@company.com"]);
  });

  it("accepts a single event object", async () => {
    const { services } = setup();
    await handleBrevoWebhook(
      webhook({ event: "unsubscribe", email: "alex@company.com" }),
      services,
    );
    expect(services.brevo.deleted).toEqual(["alex@company.com"]);
  });

  it("rejects calls without the shared secret", async () => {
    const { services } = setup();
    const response = await handleBrevoWebhook(
      webhook({ event: "unsubscribe", email: "alex@company.com" }, "wrong"),
      services,
    );
    expect(response.status).toBe(401);
    expect(services.brevo.deleted).toEqual([]);
  });
});
