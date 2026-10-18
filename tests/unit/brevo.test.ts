import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BrevoClient, BrevoError } from "@/server/brevo";
import { mockApiKey, startBrevoMock, type MockState } from "../support/brevo-mock";

let server: Server;
let state: MockState;
const port = 18675;

function client(apiKey = mockApiKey, timeoutMs = 2000) {
  return new BrevoClient({ apiUrl: `http://127.0.0.1:${port}/v3`, apiKey, timeoutMs });
}

const attributes = {
  GREETING: "Alex",
  SIGNUP_AT: "2026-10-18",
  CONFIRMED_AT: "2026-10-18",
  CONSENT_VERSION: "2026-10-18",
};

beforeAll(async () => {
  ({ server, state } = await startBrevoMock(port));
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  state.mails.length = 0;
  state.contacts.clear();
  state.requests.length = 0;
  state.failures.length = 0;
});

describe("BrevoClient", () => {
  it("sends a transactional mail with anonymous tracking consent", async () => {
    await client().sendMail({
      to: { email: "alex@company.com" },
      sender: { email: "updates@velve.dev", name: "Velve" },
      replyTo: "hello@velve.dev",
      subject: "Subject",
      html: "<p>Hi</p>",
      text: "Hi",
      tag: "confirm",
    });
    expect(state.mails).toEqual([
      {
        to: "alex@company.com",
        subject: "Subject",
        html: "<p>Hi</p>",
        text: "Hi",
        tags: ["confirm"],
        pixelConsent: false,
      },
    ]);
  });

  it("adds, finds and deletes a contact by email", async () => {
    const brevo = client();
    expect(await brevo.isOnList("a+b@company.com", 7)).toBe(false);
    await brevo.addToList("a+b@company.com", 7, attributes);
    expect(await brevo.isOnList("a+b@company.com", 7)).toBe(true);
    expect(await brevo.isOnList("a+b@company.com", 8)).toBe(false);
    await brevo.deleteContact("a+b@company.com");
    expect(state.contacts.size).toBe(0);
    expect(state.requests.at(-1)).toEqual({
      method: "DELETE",
      path: "/v3/contacts/a%2Bb%40company.com",
    });
  });

  it("treats deleting an unknown contact as done", async () => {
    await expect(client().deleteContact("ghost@company.com")).resolves.toBeUndefined();
  });

  it("checks that the list exists", async () => {
    await expect(client().checkList(7)).resolves.toBeUndefined();
  });

  it("turns upstream failures into stable codes", async () => {
    state.failures.push({ matching: null, remaining: 1 });
    await expect(client().checkList(7)).rejects.toEqual(new BrevoError("upstream_status_503"));
    await expect(client("wrong-key-0000000000").checkList(7)).rejects.toEqual(
      new BrevoError("upstream_status_401"),
    );
    await expect(
      new BrevoClient({
        apiUrl: "http://127.0.0.1:1/v3",
        apiKey: mockApiKey,
        timeoutMs: 500,
      }).checkList(7),
    ).rejects.toEqual(new BrevoError("upstream_unreachable"));
  });
});
