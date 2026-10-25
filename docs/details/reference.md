# Reference

## Environment variables

Every key is listed in `.env.example` without a value. Secrets have no default and the app refuses to serve sign-ups without them. Tunables fall back to the defaults below.

| Key                             | Secret | Default                    | Meaning                                                                                                               |
| ------------------------------- | ------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `PORT`                          | no     | 8674                       | Port the server listens on. Set by the image.                                                                         |
| `SITE_URL`                      | no     | none, required             | Public origin used in mail links, for example `https://velve.dev`.                                                    |
| `SITE_INDEXABLE`                | no     | `false`                    | `true` lets search engines in, but only once the legal review list is empty.                                          |
| `BREVO_API_URL`                 | no     | `https://api.brevo.com/v3` | Brevo API base. Tests point it at a mock.                                                                             |
| `BREVO_API_KEY`                 | yes    | none, required             | Brevo key limited to contacts and transactional mail.                                                                 |
| `BREVO_LIST_ID`                 | no     | none, required             | ID of the list "Velve waitlist".                                                                                      |
| `BREVO_SENDER_EMAIL`            | no     | none, required             | `updates@velve.dev`.                                                                                                  |
| `BREVO_SENDER_NAME`             | no     | none, required             | `Velve`.                                                                                                              |
| `BREVO_REPLY_TO`                | no     | none, required             | `hello@velve.dev`.                                                                                                    |
| `BREVO_WEBHOOK_SECRET`          | yes    | none, required, 32+ chars  | Bearer token Brevo sends to the webhook.                                                                              |
| `TOKEN_KEY`                     | yes    | none, required             | 32 random bytes, base64. Seals every link. Back it up.                                                                |
| `RATE_LIMIT_SALT_SECRET`        | yes    | none, required, 32+ chars  | Derives the daily salt for network keys and the mailbox keys.                                                         |
| `DAILY_SEND_CAP`                | no     | 150                        | Mails per UTC day across confirmation and welcome mails.                                                              |
| `SIGNUP_LIMIT_PER_IP`           | no     | 5                          | Sign-ups per network per window.                                                                                      |
| `SIGNUP_LIMIT_WINDOW_SECONDS`   | no     | 600                        | Window for the sign-up limit.                                                                                         |
| `CONFIRM_MAIL_INTERVAL_SECONDS` | no     | 86400                      | Minimum time between two confirmation mails to one mailbox. Keep it at 86400: the page tells people "one link a day". |
| `MIN_FORM_SECONDS`              | no     | 1.5                        | Minimum time between rendering the form and submitting it.                                                            |
| `LINK_LIMIT_PER_IP`             | no     | 30                         | Requests to confirm and unsubscribe routes per network per window.                                                    |
| `LINK_LIMIT_WINDOW_SECONDS`     | no     | 600                        | Window for the link limit.                                                                                            |
| `WEBHOOK_LIMIT_PER_IP`          | no     | 300                        | Webhook calls per network per window.                                                                                 |
| `WEBHOOK_LIMIT_WINDOW_SECONDS`  | no     | 60                         | Window for the webhook limit.                                                                                         |
| `CONFIRM_TOKEN_TTL_SECONDS`     | no     | 604800                     | How long a confirmation link stays valid.                                                                             |
| `CONSENT_VERSION`               | no     | none, required             | Version of the consent text, stored with each contact.                                                                |
| `HEALTH_TOKEN`                  | yes    | none, required, 32+ chars  | Bearer token for the detailed health route.                                                                           |
| `UMAMI_URL`                     | no     | none                       | Umami base URL, reached from the server over HTTPS. Without it and the website ID, no analytics run.                  |
| `UMAMI_WEBSITE_ID`              | no     | none                       | Umami website ID.                                                                                                     |

## Routes

| Route                                          | Purpose                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /`                                        | Sign-up page.                                                                                           |
| `POST /api/subscribe`                          | Sign-up. 200 for every accepted or suppressed sign-up, 400 with a problem code, 429 with `Retry-After`. |
| `GET /confirm/<token>`                         | Confirms and lists the contact.                                                                         |
| `GET /unsubscribe/<token>`                     | Asks before deleting.                                                                                   |
| `POST /api/unsubscribe/<token>`                | Deletes the contact, also for RFC 8058 one-click requests.                                              |
| `GET /unsubscribed`                            | Landing page after Brevo's campaign unsubscribe page.                                                   |
| `POST /api/webhooks/brevo`                     | Brevo unsubscribe webhooks, bearer token required.                                                      |
| `GET /api/health`                              | Liveness, no dependencies.                                                                              |
| `GET /api/health/detailed`                     | Configuration and Brevo reachability, bearer token required.                                            |
| `GET /stats/script.js`, `POST /stats/api/send` | Umami relay on our own origin. Relays only page views and the two sign-up events, without properties.   |
| `GET /imprint`, `GET /privacy`                 | Legal pages.                                                                                            |
| `GET /robots.txt`                              | Disallows everything while the site is not indexable.                                                   |

## Gates

| Gate             | Command              | Guarantees                                                                                          |
| ---------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| G1 Format        | `pnpm format:check`  | Prettier, no drift.                                                                                 |
| G2 Lint          | `pnpm lint`          | ESLint strict without inline config, knip for unused code.                                          |
| G3 Types         | `pnpm typecheck`     | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.                                 |
| Comments         | `pnpm comments:lint` | One header line of ten words at most per file.                                                      |
| Secrets          | `pnpm secrets:lint`  | No env files, keys or tokens in the repository, no values in `.env.example`.                        |
| G10 Copy         | `pnpm copy:lint`     | No forbidden phrase, every approved string verbatim.                                                |
| G4 Unit          | `pnpm test`          | Validation, names, greeting, tokens, limits, Brevo client contract, flows, workflow action pins.    |
| G11 Mails        | `pnpm emails:check`  | HTML and text for each mail, no foreign images, no tracking parameters, unsubscribe where required. |
| G5 and G12 Build | `pnpm build`         | Production build, fails if indexable with `[TODO` in the legal texts.                               |
| G6 to G9 E2E     | `pnpm e2e`           | Every state at 375, 768 and 1280 px, full flow against the Brevo mock, axe, privacy and headers.    |
| G13 Image        | `pnpm docker:check`  | The image builds, starts, turns healthy and does not run as root.                                   |

## Log events

Logs are JSON lines with `time`, `event` and sometimes `code`. They never contain an address, name, IP or token.

`signup_accepted`, `signup_suppressed` (`bot_check`, `address_interval`), `signup_rate_limited`, `send_cap_reached`, `confirm_mail_sent`, `confirm_mail_failed`, `contact_confirmed`, `contact_already_listed`, `confirm_link_invalid`, `welcome_mail_sent`, `welcome_mail_failed`, `contact_deleted` (`link`, `webhook`), `unsubscribe_link_invalid`, `webhook_rejected`, `webhook_processed`, `link_rate_limited` (`links`, `webhook`), `config_invalid` (names of invalid keys), `upstream_failed` (`analytics_script_failed`, `analytics_send_failed`), `unexpected_error`.
