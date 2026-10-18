# Decisions

Architecture decision records for the waitlist. Records are only appended. A later record supersedes an earlier one by saying so.

## ADR 1: Keep the raw design source out of the repository

**Status:** accepted, 2026-10-18

The brief asked for the design canvas files to be committed unchanged under `docs/design/source/`. The owner decided against it before the first push: the canvas notes and the design system README describe unreleased product details, and history is never rewritten, so anything pushed would stay public once the repository opens. The repository holds a derived specification (`docs/design/README.md`), the tokens and the logo mark. `CLAUDE.md` explains how agents fetch the source from the artifacts into the ignored `docs/design/source/` folder.

## ADR 2: License the code under MIT

**Status:** accepted, 2026-10-18

The brief named AGPL-3.0-only. The owner chose MIT for this public repository. A waitlist is no competitive asset, and copyleft would only discourage people from reading or reusing it. The Velve name, logo and wordmark are not covered by the licence, and Geist stays under the SIL Open Font License.

## ADR 3: Raise two design colours to pass WCAG AA

**Status:** proposed, waiting for the owner, 2026-10-18

Gate G7 allows no serious axe violations, and two values from the canvas fail it:

- The fine print under the form used `#67637A` on `#050509`, a contrast of 3.52:1. It now uses the muted text colour `#8B8797` (5.3:1). `#67637A` stays for placeholders and decorative parts only.
- White on the accent `#7B5CFF` is 4.35:1, below 4.5:1 for 14 px text, which the design system's own token notes acknowledge. The primary button fill uses `--accent-fill: #7656FA` (4.69:1). Every other accent use, including the focus ring, keeps `#7B5CFF`.

The Privacy link in the fine print is underlined again, as in the canvas, so it is not told apart by colour alone.

## ADR 4: Send the confirmation mail after the response

**Status:** accepted, 2026-10-18

New addresses, addresses already on the list, honeypot hits and suppressed repeats must get the same status, body and timing. Calling Brevo inside the request would make real sign-ups measurably slower. The handler answers first and sends the mail through Next.js `after()`. A failed send is logged with a stable code. The person sees "Check your inbox" either way and can sign up again after the per-address interval.

The sign-up endpoint never asks Brevo whether an address is already listed. A listed address gets a fresh confirmation mail, and its link leads to "You're already in". That way no response can reveal list membership.

## ADR 5: Enforce the minimum fill time with a sealed form token

**Status:** accepted, 2026-10-18

The page embeds an encrypted timestamp issued at render time. The server rejects, silently and with the normal success answer, any sign-up that arrives less than `MIN_FORM_SECONDS` after that timestamp, carries no valid token or fills the honeypot. A client-side timer alone could be skipped by any script. The token uses the same AES-256-GCM key as the link tokens, bound to its own purpose.

## ADR 6: Take the client address from the last X-Forwarded-For entry

**Status:** accepted, 2026-10-18

The app sits behind exactly one Traefik hop, which appends the address it saw. Earlier entries can be forged by the client, so the limiter uses the last one, falling back to `X-Real-IP`. The address is never stored or logged: limiter keys are an HMAC of the address with a salt derived per UTC day from `RATE_LIMIT_SALT_SECRET`. The per-address mail interval uses a stable HMAC instead, because a daily salt would reset it at midnight.

## ADR 7: Confirm on GET, check membership first

**Status:** accepted, 2026-10-18

The brief asks `GET /confirm/<token>` to create the contact. Mail scanners in some corporate inboxes fetch links before the person does, which would confirm on their behalf. A button on the confirmation page would avoid that but adds a step the design does not have. The page keeps the brief's behaviour and records the risk here. The token still proves the address received our mail, and nothing is written for broken, expired or tampered tokens. The page asks Brevo whether the address is already listed before writing, which is how "You're already in" can be told apart from "You're in". Brevo dates are day precision (`yyyy-mm-dd`), as its API requires.

## ADR 8: Unsubscribing always deletes, whichever path it takes

**Status:** accepted, 2026-10-18

"Your address is deleted" must stay true. There are four ways out:

- Our link in the welcome mail opens `/unsubscribe/<token>`, and the button deletes the contact through the Brevo API.
- `POST /api/unsubscribe/<token>` deletes without a question, for RFC 8058 one-click requests.
- Brevo campaigns cannot use our own link. Brevo's documentation says so explicitly and adds its own link if one is missing. Brevo's custom unsubscribe page redirects to `/unsubscribed`, and a Brevo webhook for `unsubscribe` events calls `/api/webhooks/brevo`, which deletes the contact. Brevo would otherwise only block it.
- Brevo adds a `List-Unsubscribe` header to transactional mails as well, and its API refuses standard headers, so we cannot point that header at our endpoint. The transactional webhook for `unsubscribed` events goes to the same endpoint.

The webhook authenticates with a bearer token in Brevo's `auth` setting, compared in constant time. Brevo documents no request signatures. The mail test before launch must confirm where Brevo's `List-Unsubscribe` header points.

## ADR 9: Serve the email logo from our own origin

**Status:** accepted, 2026-10-18

Mail clients do not render SVG and block data URIs, so the 24 px logo is a PNG at `https://velve.dev/email/logo-mark.png`. It is the same static file for every recipient, so loading it cannot tell us who opened what. No other image appears in any mail. The images are rendered by `pnpm assets:build` from the logo mark.

## ADR 10: Relay Umami through our origin without client addresses

**Status:** accepted, 2026-10-18

The browser loads `/stats/script.js` and posts events to `/stats/api/send` on our own origin, so it never talks to another host. The server forwards events to the internal Umami URL with the user agent only, never the client address. Automatic tracking is off. The page sends page views and the two events itself, and replaces `/confirm/<token>` and `/unsubscribe/<token>` with `/confirm` and `/unsubscribe`, so link tokens never reach analytics. Browsers that send Do Not Track are not counted. Without `UMAMI_URL` and `UMAMI_WEBSITE_ID` no script is rendered and both routes answer 404.

## ADR 11: Limit link routes in the proxy

**Status:** accepted, 2026-10-18

Confirmation and unsubscribe pages render on the server, and a page cannot answer 429. The Next.js proxy counts requests to `/confirm`, `/unsubscribe`, `/api/unsubscribe` and `/api/webhooks` per network, with its own limits, and answers 429 with `Retry-After` and the approved rate-limit sentence as plain text.

## ADR 12: Limit by network and by mailbox, not by spelling

**Status:** accepted, 2026-10-18

Extends ADR 6. One IPv6 customer usually holds a whole /64, so a limiter keyed on single IPv6 addresses could be sidestepped by rotating the host part. The limiter keys IPv6 clients on their /64 prefix and IPv4-mapped IPv6 addresses on the IPv4 address. The per-address mail interval keys on the mailbox: a `+tag` is dropped, and for Gmail the dots and the `googlemail.com` alias as well, so one inbox cannot be flooded through spelling variants. The mail itself still goes to the address as typed. The request body is read as a stream and abandoned once it passes 4 KiB, so an oversized body costs nothing.
