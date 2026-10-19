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

The brief asks `GET /confirm/<token>` to create the contact. Mail scanners in some corporate inboxes fetch links before the person does, which would confirm on their behalf. A button on the confirmation page would avoid that but adds a step the design does not have. The page keeps the brief's behaviour and records the risk here. The token still proves the address received our mail, and nothing is written for broken, expired or tampered tokens. The page asks Brevo whether the address is already listed before writing, which is how "You're already in" can be told apart from "You're in". A scanner and the person often open the link at the same moment, so while one confirmation for an address is running, further clicks wait for it and get "You're already in"; the contact is written and welcomed once. The pages send no referrer, so a link token never reaches another site. Brevo dates are day precision (`yyyy-mm-dd`), as its API requires.

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

The browser loads `/stats/script.js` and posts events to `/stats/api/send` on our own origin, so it never talks to another host. The server forwards events to the internal Umami URL with the user agent only, never the client address. Automatic tracking is off. The page sends page views and the two events itself, and replaces `/confirm/<token>` and `/unsubscribe/<token>` with `/confirm` and `/unsubscribe`, so link tokens never reach analytics. On any other path, a segment that looks like a token or holds an `@` is reported as `redacted`, which covers mistyped links that land on the 404 page. Browsers that send Do Not Track are not counted. Without `UMAMI_URL` and `UMAMI_WEBSITE_ID` no script is rendered and both routes answer 404.

## ADR 11: Limit link routes in the proxy

**Status:** accepted, 2026-10-18

Confirmation and unsubscribe pages render on the server, and a page cannot answer 429. The Next.js proxy counts requests to `/confirm`, `/unsubscribe`, `/api/unsubscribe` and `/api/webhooks` per network, with its own limits, and answers 429 with `Retry-After` and the approved rate-limit sentence as plain text.

## ADR 12: Limit by network and by mailbox, not by spelling

**Status:** accepted, 2026-10-18

Extends ADR 6. One IPv6 customer usually holds a whole /64, so a limiter keyed on single IPv6 addresses could be sidestepped by rotating the host part. The limiter keys IPv6 clients on their /64 prefix and IPv4-mapped IPv6 addresses on the IPv4 address. The per-address mail interval keys on the mailbox: a `+tag` is dropped, and for Gmail the dots and the `googlemail.com` alias as well, so one inbox cannot be flooded through spelling variants. The mail itself still goes to the address as typed. The request body is read as a stream and abandoned once it passes 4 KiB, so an oversized body costs nothing.

## ADR 13: A nonce-based content security policy on every page

**Status:** accepted, 2026-10-18

The Next.js proxy creates a fresh nonce per request and sends `script-src 'self' 'nonce-…' 'strict-dynamic'`, `style-src 'self' 'nonce-…'`, `connect-src 'self'`, `img-src 'self' data:`, `font-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'` and `frame-ancestors 'none'`, plus `upgrade-insecure-requests` when `SITE_URL` is https. There is no `unsafe-inline` and, outside development, no `unsafe-eval`. Every page therefore renders per request, which costs nothing at this size. API, analytics and static responses get `default-src 'none'`. All responses carry `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, the cross-origin isolation headers and HSTS without subdomains, so Brevo's tracking subdomain is not forced into anything. Only the mail images under `/email/` send `Cross-Origin-Resource-Policy: cross-origin`, because webmail clients load them from their own origin. The end-to-end suite fails if a page triggers a policy violation.

## ADR 14: Search engines stay out until the legal review is done

**Status:** accepted, 2026-10-18

`SITE_INDEXABLE` decides at runtime, because Dokploy sets the environment after the image is built. The open legal review points live in `pendingLegalReview` in `src/content/legal.ts`, each starting with `[TODO]`. The site stays `noindex` (meta tag, `X-Robots-Tag` and `robots.txt`) as long as that list is not empty, even when `SITE_INDEXABLE=true`. The build also fails when `SITE_INDEXABLE=true` is set at build time and the file still contains `[TODO`. The markers are kept out of the rendered text so the published imprint and privacy pages stay word for word as approved.

## ADR 15: Health without dependencies, detail behind a token

**Status:** accepted, 2026-10-18

`GET /api/health` answers 200 with `status`, `service` and `timestamp` and touches nothing else, so the container health check never flaps with Brevo. `GET /api/health/detailed` needs `Authorization: Bearer <HEALTH_TOKEN>`, checks the configuration and that the Brevo list is reachable within 2 seconds, and reports `ok`, `degraded` (200) or `error` (503 for an invalid configuration). It names no host, key or upstream.

## ADR 16: The image check runs in CI, not in `pnpm verify`

**Status:** accepted, 2026-10-18

The brief asks `pnpm verify` to run every gate, and G13 allows the image check to run only in CI where no Docker daemon is available locally. `pnpm docker:check` builds the image, starts it and waits for a healthy `HEALTHCHECK`, which needs a Docker daemon and takes minutes. Making it part of `pnpm verify` would block every push from a machine without Docker and slow the pre-push hook for no gain on most changes. CI therefore runs it as its own job on every push to `main`, next to `pnpm verify`, and the deploy workflow only starts when both jobs are green. Anyone changing `Dockerfile.dokploy`, `.dockerignore` or the build output runs `pnpm docker:check` locally before pushing.

## ADR 17: Close the legal review points and allow indexing

**Status:** accepted, 2026-10-18, supersedes the open points listed under ADR 14

The owner settled the four open legal points:

- **Hosting:** the servers are rented from Hetzner in Falkenstein, Datalix in Frankfurt and Virtbase in the Netherlands, each under a data processing agreement. The privacy policy names them by brand.
- **Logs:** logs are not deleted on a schedule, so the sentence "Server logs are deleted after 7 days" is replaced. The app never logs email addresses, names or IP addresses, Traefik writes no access logs for this app, and logs are not used for analytics. The privacy policy now says exactly that.
- **Brevo:** Brevo's current privacy policy and imprint give Sendinblue SAS, 17 rue Salneuve, 75017 Paris, France (RCS Paris 498 019 298). The address in the brief, 106 boulevard Haussmann, is out of date.
- **Tracking sentence:** released by the owner. It is only true once per-contact pixel tracking consent is switched on in Brevo, as the Brevo checklist says, and the mail test should still confirm it.

`pendingLegalReview` is empty, so `SITE_INDEXABLE=true` in Dokploy now lets search engines in. Naming hosting providers in the privacy policy is required by law and is not affected by the copy rule against naming providers in marketing text.

## ADR 18: A failed confirmation mail does not lock the mailbox

**Status:** accepted, 2026-10-18, extends ADR 4 and ADR 12

The per-mailbox interval is spent before the mail goes out, because the mail is sent after the response. When Brevo refuses the send, the interval is now released again, so the next attempt sends a real mail instead of answering "Check your inbox" for a mail that never left. The answer to the visitor stays the same either way.

## ADR 19: Tell everyone about the spam folder and the daily link

**Status:** accepted, 2026-10-18

Because suppressed sign-ups answer like new ones (ADR 4), someone who signs up twice sees "Check your inbox" without a second mail. Under "Check your inbox" every visitor now reads "Nothing there? Check your spam folder. Each address gets one link a day." It is shown to everyone, so it reveals nothing about any address. The owner approved the wording as a deliberate exception to the rule against naming time limits in copy. The sentence is only true while `CONFIRM_MAIL_INTERVAL_SECONDS` stays at 86400.

## ADR 20: Optional questions stored as Brevo attributes

**Status:** accepted, 2026-10-19

Velve wants to know what people would deploy first and where it runs today. The answers are stored as three attributes on the existing Brevo contact (`FIRST_DEPLOY`, `RUNS_ON`, `ANSWERED_AT`), not in a database of our own, for the same reason as ADR 4: there is no second copy to protect, back up or delete, and unsubscribing deletes the answers along with the contact.

- **Where the questions appear:** directly on "You're in" and "You're already in", under a hairline, because right after confirming is when people are most willing to answer. The welcome mail links to `/questions/<token>` for everyone who skipped them. The last answer wins.
- **Allowlist, no free text:** each answer is one slug from a fixed list. Nothing typed by a visitor reaches Brevo, so the questions cannot carry personal data or abuse.
- **Tokens with a purpose:** the questions link is an AES-256-GCM token of its own purpose, sealed with the purpose as authenticated data and in the payload, without expiry. An unsubscribe token cannot vote and a questions token cannot unsubscribe. Tokens sealed before the payload carried a purpose still work.
- **Equal treatment:** a vote for a contact that no longer exists does the same Brevo round trips and gets the same answer as a stored one, so the endpoint cannot tell whether an address is still on the list.
- **Missing attributes:** Brevo drops attribute names it does not know without an error and ignores values of the wrong type. The server reads the contact back after the update and reports `answers_attribute_missing` when the answers did not land, and the visitor sees the normal error message.
- **Sharing without tracking:** "Share on Threads" is a plain link to `https://www.threads.com/intent/post?text=…`, the web intent documented by Meta, opened in a new tab with `noopener noreferrer`. Nothing from Threads is loaded on our pages, so G8 stays green. Umami counts a vote as `questions_answered`, without properties.

## ADR 21: Turn away server action probes in the proxy

**Status:** accepted, 2026-10-19

Scanners send `POST` requests with a `Next-Action` header and made-up IDs such as `y`, looking for Next.js server actions. The app has no server actions, so Next answered "Server action not found." and wrote a multi-line error with a stack trace to the log for every probe, which buried the events that matter. The proxy now answers every request that carries the header with an empty 404, the resource policy and `no-store`, before Next sees it, and logs a single `server_action_probe` line without path, address or header values. If the app ever gains a server action, this check has to go first, and the e2e test in `security.spec.ts` will say so.
