# Guide

This guide explains how the waitlist works for someone who is new to the code. Reference tables live in [`docs/details/reference.md`](../details/reference.md), decisions in [`docs/decisions.md`](../decisions.md), and the diagrams in [`docs/architecture/`](../architecture/README.md).

## The idea in one paragraph

A visitor leaves an email address and, if they like, a first name. Nothing is stored at that moment. The server seals the address, the name, the time and the consent version into an encrypted link and sends it in a confirmation mail through Brevo. Only when the link is opened does the address become a contact on the Brevo list, and from then on Brevo is the only place it lives. Leaving the list, whichever way it happens, deletes the contact.

## Where things are

| Path              | What it holds                                                                 |
| ----------------- | ----------------------------------------------------------------------------- |
| `src/app/`        | Pages and API routes. The App Router maps folders to URLs.                    |
| `src/components/` | The page shell, form, notices and message pages.                              |
| `src/content/`    | Every user-facing string (`copy.ts`) and the legal texts (`legal.ts`).        |
| `src/lib/`        | Code shared by browser and server: email checks, name cleaning, analytics.    |
| `src/server/`     | Server-only code: configuration, tokens, limits, the Brevo client, the flows. |
| `src/proxy.ts`    | Runs before every request: security headers, nonce, link rate limits.         |
| `emails/`         | Mail copy, the table layout, and the generated Brevo update template.         |
| `scripts/`        | The custom gates and asset rendering.                                         |
| `tests/`          | Vitest unit tests, Playwright end-to-end tests and the Brevo mock.            |

## Signing up

The page is rendered per request because it embeds two things: a fresh CSP nonce and a sealed form token holding the render time. When someone submits, `POST /api/subscribe` first checks the daily send cap, then the per-network limit, then the address. Bots that fill the hidden `website` field, submit faster than `MIN_FORM_SECONDS` or send no valid form token get the normal success answer and no mail. So does the second sign-up for the same mailbox within `CONFIRM_MAIL_INTERVAL_SECONDS`, where plus tags and Gmail dots count as the same mailbox. The confirmation mail goes out after the response, so every outcome answers in the same time.

## Confirming

`/confirm/<token>` opens the sealed link. A broken or expired link shows its own page. Otherwise the server asks Brevo whether the address is already on the list. If it is, the page says "You're already in". If not, the contact is created with `GREETING`, `SIGNUP_AT`, `CONFIRMED_AT`, `CONSENT_VERSION` and the first name if one was given, the welcome mail is sent, and the page says "You're in". Two clicks at the same moment are handled as one.

## Leaving

The welcome mail links to `/unsubscribe/<token>`, which asks once and then deletes the contact through Brevo. A `POST` to `/api/unsubscribe/<token>` deletes without asking, for mail clients that support one-click unsubscribe. Update mails are Brevo campaigns, which must use Brevo's own unsubscribe link. Brevo's unsubscribe page redirects to `/unsubscribed`, and Brevo's webhook calls `/api/webhooks/brevo`, which deletes the contact. The [Brevo guide](brevo.md) lists every setting this needs.

## Protection

Limits apply at three levels in the app: per network for sign-ups, per mailbox for confirmation mails, and per day for all mails together. The client address comes from `X-Real-IP`, which Scaleway sets. Link and webhook routes have their own per-network limits in the proxy. Network keys are HMACs of the client address with a salt that changes every UTC day, and IPv6 addresses count per /64. Raw addresses, names, emails and tokens are never stored or logged. The logs only carry event names and stable codes.

Every page gets a nonce-based content security policy without `unsafe-inline`, and the end-to-end suite fails on any request to another origin, any cookie, any browser storage and any policy violation.

## Analytics

Umami runs on Scaleway as well, operated by Levo Studio, and the server reaches it over HTTPS. The browser loads `/stats/script.js` and posts to `/stats/api/send` on our own origin, and the server relays to Umami without the client address. Automatic tracking is off: the page sends page views with token paths reduced to `/confirm` and `/unsubscribe`, plus the events `signup_submitted` and `signup_confirmed`, without properties. The relay refuses anything else.

## Mails

The confirmation and welcome mails are rendered on the server as dark table HTML with inline styles and a plain text version. The update template is generated from the same layout with `pnpm emails:build` into `emails/update.html`, and `pnpm emails:check` fails when it is out of date, when an image comes from a foreign server, when a tracking parameter appears or when an unsubscribe link is missing. The [Brevo guide](brevo.md) explains how to use the template.

## Configuration

Every secret and every tunable comes from the environment. `.env.example` lists the keys, [`docs/details/reference.md`](../details/reference.md) explains each one with its default, and the [Scaleway guide](scaleway.md) says where they go.

## Gates

`pnpm verify` runs formatting, ESLint and knip, TypeScript, the comment, secret and copy checks, unit tests, the mail check, the production build with its legal guard, and the end-to-end suite with accessibility, privacy and header checks. The pre-push hook runs it before every push. `pnpm docker:check` builds and starts the image and runs in CI.
