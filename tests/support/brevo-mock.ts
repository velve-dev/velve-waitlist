// Stands in for the Brevo API and Umami during tests.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export type MockMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  tags: string[];
  pixelConsent: unknown;
};

export type MockState = {
  mails: MockMail[];
  contacts: Map<string, { listIds: number[]; attributes: Record<string, unknown> }>;
  umamiEvents: unknown[];
  failures: { matching: string | null; remaining: number }[];
  missingAttributes: { matching: string; names: string[] }[];
  requests: { method: string; path: string }[];
};

export const mockApiKey = "test-brevo-api-key-0123456789";

const fakeTracker = `(() => {
  const script = document.currentScript;
  const host = script.getAttribute("data-host-url");
  const website = script.getAttribute("data-website-id");
  window.umami = {
    track(build) {
      const payload = build({ website, hostname: location.hostname, language: navigator.language, screen: "0x0", title: document.title, url: location.pathname, referrer: document.referrer });
      fetch(host + "/api/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "event", payload }) }).then((response) => response.text());
    },
  };
})();`;

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString("utf8")));
    request.on("end", () => resolve(body));
  });
}

function send(response: ServerResponse, status: number, body?: unknown) {
  response.writeHead(status, body === undefined ? {} : { "content-type": "application/json" });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

function isValidMail(body: Record<string, unknown>): boolean {
  const sender = body.sender as { email?: unknown } | undefined;
  const to = body.to as { email?: unknown; contactPixelTrackingConsent?: unknown }[] | undefined;
  return (
    typeof sender?.email === "string" &&
    Array.isArray(to) &&
    to.length === 1 &&
    typeof to[0]?.email === "string" &&
    typeof to[0].contactPixelTrackingConsent === "boolean" &&
    typeof body.subject === "string" &&
    typeof body.htmlContent === "string" &&
    typeof body.textContent === "string"
  );
}

async function route(state: MockState, request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", "http://mock");
  const method = request.method ?? "GET";
  const raw = await readBody(request);

  if (url.pathname === "/umami/script.js") {
    response.writeHead(200, { "content-type": "application/javascript" });
    response.end(fakeTracker);
    return;
  }
  if (url.pathname === "/umami/api/send") {
    state.umamiEvents.push(JSON.parse(raw) as unknown);
    send(response, 200, { ok: true });
    return;
  }
  if (url.pathname === "/__mock/attributes") {
    state.missingAttributes.push({
      matching: url.searchParams.get("matching") ?? "",
      names: (url.searchParams.get("missing") ?? "").split(",").filter((name) => name !== ""),
    });
    send(response, 200, { ok: true });
    return;
  }
  if (url.pathname === "/__mock/state") {
    send(response, 200, {
      mails: state.mails,
      contacts: Object.fromEntries(state.contacts),
      umamiEvents: state.umamiEvents,
    });
    return;
  }
  if (url.pathname === "/__mock/fail") {
    state.failures.push({
      matching: url.searchParams.get("matching"),
      remaining: Number(url.searchParams.get("count") ?? "1"),
    });
    send(response, 200, { ok: true });
    return;
  }

  state.requests.push({ method, path: url.pathname });
  if (request.headers["api-key"] !== mockApiKey)
    return send(response, 401, { code: "unauthorized" });
  const failure = state.failures.find(
    ({ matching, remaining }) =>
      remaining > 0 &&
      (matching === null ||
        decodeURIComponent(url.pathname).includes(matching) ||
        raw.includes(matching)),
  );
  if (failure !== undefined) {
    failure.remaining -= 1;
    return send(response, 503, { code: "unavailable" });
  }

  const body = raw === "" ? {} : (JSON.parse(raw) as Record<string, unknown>);
  const contactMatch = /^\/v3\/contacts\/([^/]+)$/.exec(url.pathname);
  const listMatch = /^\/v3\/contacts\/lists\/(\d+)$/.exec(url.pathname);

  if (method === "POST" && url.pathname === "/v3/smtp/email") {
    if (!isValidMail(body)) return send(response, 400, { code: "invalid_parameter" });
    const to = (body.to as { email: string; contactPixelTrackingConsent: unknown }[])[0]!;
    state.mails.push({
      to: to.email,
      subject: body.subject as string,
      html: body.htmlContent as string,
      text: body.textContent as string,
      tags: (body.tags as string[] | undefined) ?? [],
      pixelConsent: to.contactPixelTrackingConsent,
    });
    return send(response, 201, { messageId: `<${state.mails.length}@mock>` });
  }
  if (method === "POST" && url.pathname === "/v3/contacts") {
    const email = body.email;
    if (typeof email !== "string" || !Array.isArray(body.listIds)) {
      return send(response, 400, { code: "invalid_parameter" });
    }
    const existed = state.contacts.has(email);
    state.contacts.set(email, {
      listIds: body.listIds as number[],
      attributes: (body.attributes as Record<string, unknown> | undefined) ?? {},
    });
    return existed ? send(response, 204) : send(response, 201, { id: state.contacts.size });
  }
  if (listMatch !== null && method === "GET")
    return send(response, 200, { id: Number(listMatch[1]) });
  if (contactMatch !== null) {
    if (url.searchParams.get("identifierType") !== "email_id") {
      return send(response, 400, { code: "invalid_parameter" });
    }
    const email = decodeURIComponent(contactMatch[1]!);
    const contact = state.contacts.get(email);
    if (method === "GET") {
      return contact === undefined
        ? send(response, 404, { code: "document_not_found" })
        : send(response, 200, { email, listIds: contact.listIds, attributes: contact.attributes });
    }
    if (method === "PUT") {
      if (contact === undefined) return send(response, 404, { code: "document_not_found" });
      const attributes = (body.attributes as Record<string, unknown> | undefined) ?? {};
      const missing = state.missingAttributes
        .filter((rule) => email.includes(rule.matching))
        .flatMap((rule) => rule.names);
      for (const [name, value] of Object.entries(attributes)) {
        if (!missing.includes(name)) contact.attributes[name] = value;
      }
      return send(response, 204);
    }
    if (method === "DELETE") {
      if (contact === undefined) return send(response, 404, { code: "document_not_found" });
      state.contacts.delete(email);
      return send(response, 204);
    }
  }
  send(response, 404, { code: "not_found" });
}

export function startBrevoMock(port: number): Promise<{ server: Server; state: MockState }> {
  const state: MockState = {
    mails: [],
    contacts: new Map(),
    umamiEvents: [],
    failures: [],
    missingAttributes: [],
    requests: [],
  };
  const server = createServer((request, response) => {
    route(state, request, response).catch(() => send(response, 500, { code: "mock_error" }));
  });
  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () => resolve({ server, state })),
  );
}
