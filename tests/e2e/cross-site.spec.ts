import { expect, test, type APIRequestContext } from "@playwright/test";
import { mailsTo, uniqueEmail, waitForMail } from "./helpers";

const network = "10.213.0.1";

async function renderedFormToken(request: APIRequestContext): Promise<string> {
  const html = await (await request.get("/", { headers: { "x-forwarded-for": network } })).text();
  const token = /formToken\\?":\\?"([A-Za-z0-9_-]+)/.exec(html)?.[1];
  expect(token).toBeDefined();
  await new Promise((resolve) => setTimeout(resolve, 1600));
  return token!;
}

test("sign-ups sent from another site get the normal answer and no mail", async ({
  request,
  baseURL,
}) => {
  const formToken = await renderedFormToken(request);
  const signUpWith = (email: string, headers: Record<string, string>) =>
    request.post("/api/subscribe", {
      headers: {
        "content-type": "text/plain;charset=UTF-8",
        "x-forwarded-for": network,
        ...headers,
      },
      data: JSON.stringify({ email, formToken }),
    });
  const fromFetchMetadata = uniqueEmail("cross-site");
  const fromSibling = uniqueEmail("same-site");
  const visitor = uniqueEmail("own-origin");
  const answers = [
    await signUpWith(fromFetchMetadata, {
      origin: "https://evil.example",
      "sec-fetch-site": "cross-site",
    }),
    await signUpWith(fromSibling, {
      origin: "https://blog.velve.dev",
      "sec-fetch-site": "same-site",
    }),
    await signUpWith(visitor, { origin: new URL(baseURL!).origin }),
  ];
  for (const answer of answers) {
    expect(answer.status()).toBe(200);
    expect(await answer.json()).toEqual({ ok: true });
  }
  await waitForMail(visitor, "Confirm your spot on the Velve waitlist");
  expect(await mailsTo(fromFetchMetadata)).toEqual([]);
  expect(await mailsTo(fromSibling)).toEqual([]);
});
