// Minimal typed client for the Brevo endpoints the waitlist uses.
import "server-only";

export type BrevoSettings = {
  apiUrl: string;
  apiKey: string;
  timeoutMs: number;
};

export type OutgoingMail = {
  to: { email: string; name?: string };
  sender: { email: string; name: string };
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  tag: string;
};

export type ContactAttributes = {
  FIRSTNAME?: string;
  GREETING: string;
  SIGNUP_AT: string;
  CONFIRMED_AT: string;
  CONSENT_VERSION: string;
};

const absent = Symbol("absent");

export class BrevoError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export class BrevoClient {
  constructor(private readonly settings: BrevoSettings) {}

  async sendMail(mail: OutgoingMail): Promise<void> {
    await this.call("POST", "/smtp/email", {
      sender: mail.sender,
      to: [{ ...mail.to, contactPixelTrackingConsent: false }],
      replyTo: { email: mail.replyTo },
      subject: mail.subject,
      htmlContent: mail.html,
      textContent: mail.text,
      tags: [mail.tag],
    });
  }

  async isOnList(email: string, listId: number): Promise<boolean> {
    const response = await this.call("GET", contactPath(email), undefined, [400, 404]);
    if (response === absent || response === null) return false;
    const listIds = (response as { listIds?: unknown }).listIds;
    return Array.isArray(listIds) && listIds.includes(listId);
  }

  async addToList(email: string, listId: number, attributes: ContactAttributes): Promise<void> {
    await this.call("POST", "/contacts", {
      email,
      attributes,
      listIds: [listId],
      updateEnabled: true,
    });
  }

  async updateContact(
    email: string,
    attributes: Record<string, string>,
  ): Promise<"updated" | "missing"> {
    const response = await this.call("PUT", contactPath(email), { attributes }, [404]);
    return response === absent ? "missing" : "updated";
  }

  async contactAttributes(email: string): Promise<Record<string, unknown> | null> {
    const response = await this.call("GET", contactPath(email), undefined, [404]);
    if (response === absent || response === null) return null;
    const attributes = (response as { attributes?: unknown }).attributes;
    return typeof attributes === "object" && attributes !== null
      ? (attributes as Record<string, unknown>)
      : {};
  }

  async deleteContact(email: string): Promise<void> {
    await this.call("DELETE", contactPath(email), undefined, [404]);
  }

  async checkList(listId: number): Promise<void> {
    await this.call("GET", `/contacts/lists/${listId}`);
  }

  private async call(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: object,
    absentStatuses: number[] = [],
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.settings.apiUrl}${path}`, {
        method,
        headers: {
          accept: "application/json",
          "api-key": this.settings.apiKey,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(this.settings.timeoutMs),
        cache: "no-store",
      });
    } catch (error) {
      throw new BrevoError(
        error instanceof Error && error.name === "TimeoutError"
          ? "upstream_timeout"
          : "upstream_unreachable",
      );
    }
    if (absentStatuses.includes(response.status)) return absent;
    if (!response.ok) throw new BrevoError(`upstream_status_${response.status}`);
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("application/json") ? ((await response.json()) as unknown) : null;
  }
}

function contactPath(email: string): string {
  return `/contacts/${encodeURIComponent(email)}?identifierType=email_id`;
}
