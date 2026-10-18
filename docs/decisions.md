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
