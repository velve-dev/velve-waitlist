import { randomBytes } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readAnswers } from "@/lib/questions";
import { handleAnswers } from "@/server/answers";
import { BrevoClient } from "@/server/brevo";
import {
  createConfirmToken,
  createQuestionsToken,
  createUnsubscribeToken,
  readConfirmToken,
  readQuestionsToken,
  readUnsubscribeToken,
} from "@/server/link-tokens";
import { sealToken } from "@/server/tokens";
import { mockApiKey, startBrevoMock, type MockState } from "../support/brevo-mock";
import { testServices } from "../support/services";

const now = Date.UTC(2026, 9, 19, 10);

function answerRequest(body: unknown, ip = "203.0.113.50") {
  return new Request("https://velve.test/api/questions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function setup(env: Record<string, string> = {}) {
  const services = testServices({ env, now: () => now });
  const tokenFor = (email: string) => createQuestionsToken(email, services.config.tokenKey);
  return { services, tokenFor };
}

describe("token purposes", () => {
  const key = randomBytes(32);

  it("keeps each token to its own purpose", () => {
    const questions = createQuestionsToken("alex@company.com", key);
    const unsubscribe = createUnsubscribeToken("alex@company.com", key);
    expect(readQuestionsToken(questions, key)).toBe("alex@company.com");
    expect(readUnsubscribeToken(unsubscribe, key)).toBe("alex@company.com");
    expect(readUnsubscribeToken(questions, key)).toBeNull();
    expect(readQuestionsToken(unsubscribe, key)).toBeNull();
    const confirm = createConfirmToken(
      { email: "alex@company.com", firstName: "", signedUpAt: now, consentVersion: "v" },
      key,
    );
    expect(readQuestionsToken(confirm, key)).toBeNull();
  });

  it("still accepts tokens sealed before the purpose field existed", () => {
    const legacyUnsubscribe = sealToken("unsubscribe", { e: "alex@company.com" }, key);
    const legacyConfirm = sealToken(
      "confirm",
      { e: "alex@company.com", n: "", t: now, c: "v" },
      key,
    );
    expect(readUnsubscribeToken(legacyUnsubscribe, key)).toBe("alex@company.com");
    expect(readConfirmToken(legacyConfirm, key, now, 60)?.email).toBe("alex@company.com");
  });

  it("refuses a payload that names another purpose", () => {
    const forged = sealToken("questions", { p: "unsubscribe", e: "alex@company.com" }, key);
    expect(readQuestionsToken(forged, key)).toBeNull();
  });
});

describe("readAnswers", () => {
  it("accepts only slugs from the allowlist", () => {
    expect(readAnswers({ firstDeploy: "web_app", runsOn: "own_server" })).toEqual({
      firstDeploy: "web_app",
      runsOn: "own_server",
    });
    expect(readAnswers({ firstDeploy: "Web app", runsOn: "own_server" })).toBeNull();
    expect(readAnswers({ firstDeploy: "web_app", runsOn: "<script>" })).toBeNull();
    expect(readAnswers({ firstDeploy: "web_app" })).toBeNull();
    expect(readAnswers({ firstDeploy: "toString", runsOn: "constructor" })).toBeNull();
    expect(readAnswers(null)).toBeNull();
  });
});

describe("handleAnswers", () => {
  it("stores the answers with the answer date", async () => {
    const { services, tokenFor } = setup();
    services.brevo.listed.set("alex@company.com", {});
    const response = await handleAnswers(
      answerRequest({ token: tokenFor("alex@company.com"), firstDeploy: "api", runsOn: "paas" }),
      services,
    );
    expect(response.status).toBe(200);
    expect(services.brevo.updated.get("alex@company.com")).toEqual({
      FIRST_DEPLOY: "api",
      RUNS_ON: "paas",
      ANSWERED_AT: "2026-10-19",
    });
  });

  it("lets a second vote replace the first", async () => {
    const { services, tokenFor } = setup();
    services.brevo.listed.set("alex@company.com", {});
    const token = tokenFor("alex@company.com");
    await handleAnswers(answerRequest({ token, firstDeploy: "api", runsOn: "paas" }), services);
    await handleAnswers(
      answerRequest({ token, firstDeploy: "database", runsOn: "nowhere" }),
      services,
    );
    expect(services.brevo.updated.get("alex@company.com")).toMatchObject({
      FIRST_DEPLOY: "database",
      RUNS_ON: "nowhere",
    });
  });

  it("answers a deleted contact exactly like a stored one", async () => {
    const { services, tokenFor } = setup();
    services.brevo.listed.set("kept@company.com", {});
    const kept = await handleAnswers(
      answerRequest({ token: tokenFor("kept@company.com"), firstDeploy: "api", runsOn: "paas" }),
      services,
    );
    const gone = await handleAnswers(
      answerRequest({ token: tokenFor("gone@company.com"), firstDeploy: "api", runsOn: "paas" }),
      services,
    );
    expect({ status: gone.status, body: await gone.text() }).toEqual({
      status: kept.status,
      body: await kept.text(),
    });
    expect(services.brevo.updated.has("gone@company.com")).toBe(false);
  });

  it("rejects broken tokens and answers outside the allowlist", async () => {
    const { services, tokenFor } = setup();
    const broken = await handleAnswers(
      answerRequest({ token: "broken", firstDeploy: "api", runsOn: "paas" }),
      services,
    );
    expect(broken.status).toBe(400);
    expect(await broken.json()).toEqual({ error: "invalid_link" });
    const freeText = await handleAnswers(
      answerRequest({
        token: tokenFor("a@company.com"),
        firstDeploy: "kubernetes",
        runsOn: "paas",
      }),
      services,
    );
    expect(freeText.status).toBe(400);
    expect(await freeText.json()).toEqual({ error: "invalid_answer" });
  });

  it("limits votes per network", async () => {
    const { services, tokenFor } = setup({ QUESTIONS_LIMIT_PER_IP: "2" });
    const body = { token: tokenFor("a@company.com"), firstDeploy: "api", runsOn: "paas" };
    await handleAnswers(answerRequest(body), services);
    await handleAnswers(answerRequest(body), services);
    const limited = await handleAnswers(answerRequest(body), services);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("600");
    expect((await handleAnswers(answerRequest(body, "198.51.100.9"), services)).status).toBe(200);
  });

  it("reports a clean failure when Brevo is down", async () => {
    const { services, tokenFor } = setup();
    services.brevo.updateContact = () => Promise.reject(new Error("down"));
    const response = await handleAnswers(
      answerRequest({ token: tokenFor("a@company.com"), firstDeploy: "api", runsOn: "paas" }),
      services,
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "failed" });
  });
});

describe("Brevo contact update", () => {
  let server: Server;
  let state: MockState;
  const port = 18676;
  const brevo = () =>
    new BrevoClient({ apiUrl: `http://127.0.0.1:${port}/v3`, apiKey: mockApiKey, timeoutMs: 2000 });

  beforeAll(async () => {
    ({ server, state } = await startBrevoMock(port));
  });

  afterAll(() => {
    server.close();
  });

  it("updates attributes and reads them back", async () => {
    state.contacts.set("alex@company.com", { listIds: [7], attributes: { GREETING: "Alex" } });
    expect(await brevo().updateContact("alex@company.com", { FIRST_DEPLOY: "api" })).toBe(
      "updated",
    );
    expect(await brevo().contactAttributes("alex@company.com")).toEqual({
      GREETING: "Alex",
      FIRST_DEPLOY: "api",
    });
    expect(state.requests.at(-2)).toEqual({
      method: "PUT",
      path: "/v3/contacts/alex%40company.com",
    });
  });

  it("reports a missing contact", async () => {
    expect(await brevo().updateContact("ghost@company.com", { FIRST_DEPLOY: "api" })).toBe(
      "missing",
    );
    expect(await brevo().contactAttributes("ghost@company.com")).toBeNull();
  });

  it("turns attributes Brevo silently drops into a clean error code", async () => {
    const services = testServices({ now: () => now });
    services.brevo = Object.assign(services.brevo, {
      updateContact: brevo().updateContact.bind(brevo()),
      contactAttributes: brevo().contactAttributes.bind(brevo()),
    });
    state.contacts.set("noattr@company.com", { listIds: [7], attributes: {} });
    state.missingAttributes.push({ matching: "noattr@", names: ["FIRST_DEPLOY", "RUNS_ON"] });
    const response = await handleAnswers(
      answerRequest({
        token: createQuestionsToken("noattr@company.com", services.config.tokenKey),
        firstDeploy: "api",
        runsOn: "paas",
      }),
      services,
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "failed" });
  });
});
