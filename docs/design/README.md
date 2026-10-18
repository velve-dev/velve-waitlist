# Waitlist design

This is the visual specification for the Velve waitlist, derived from the design canvas "Velve waitlist" and the Velve Design System. Every value below was read from the design code. For look and feel the canvas wins; for behaviour and copy the brief wins, and the copy lives in [`src/content/copy.ts`](../../src/content/copy.ts) and [`emails/`](../../emails/).

## Where the source lives

The design source is not part of this repository. It sits in two claude.ai artifacts behind the owner's login:

| Artifact | Files |
| --- | --- |
| Design canvas "Velve waitlist", `https://claude.ai/artifact/RiCajpGtPrQFoJWzxT2yjJ` | `project/Main.dc.html`, `project/Footer.dc.html`, `project/Legal.dc.html`, `project/Email.dc.html`, `project/canvas.json` |
| Velve Design System, `https://claude.ai/artifact/K56a2VENtSLKy3Tf3ghZ67` | `project/tokens.json`, `project/assets/logo-mark.svg`, `project/README.md` |

An agent with the Artifact tool reads them with `action: "read"`, the `url` above and the paths as `paths`, and saves them under `docs/design/source/`, which git ignores. Nothing from that folder is committed: the source carries unreleased product detail and internal notes. Only [`tokens.json`](tokens.json) and [`logo-mark.svg`](logo-mark.svg) are committed copies.

A `.dc.html` file is a design template, not production code to copy. It is plain HTML with inline styles, `{{placeholders}}`, `<sc-if>` conditions and a `Component` class whose `renderVals()` returns the values. Read a state by setting `state` and `mobile`, working out `renderVals()` and substituting the placeholders.

PNG exports of the artboards may be placed in `docs/design/reference/` for visual comparison. That folder is ignored as well. Screenshots of the build live in [`screens/`](screens/).

## Breakpoint

One breakpoint at **720 px**. Below it the mobile layout applies, from 720 px up the desktop layout. The pages are built from 375 px and checked at 375, 768 and 1280 px, so 768 px renders the desktop layout.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `bg-base` | `#050509` | Page |
| `surface-card` | `#09090D` | Cards, inputs, icon tiles, secondary buttons |
| `surface-raised` | `#0D0D13` | Footer wordmark fill |
| `surface-hover` | `#121218` | Secondary button hover |
| `border-default` | `#1A1922` | Every hairline |
| `border-strong` | `#26242F` | Secondary button border, hover border, wordmark stroke |
| `text-primary` | `#F1F0F4` | Text |
| `text-muted` | `#8B8797` | Secondary text |
| `text-faint` | `#67637A` | Placeholders and fine print only |
| `text-link` | `#B8A6FF` | Links, link hover |
| `accent` | `#7B5CFF` | Primary button, focus border, ring, submitted dot. Nothing else |
| `status-live` | `#3FAF6B` | Live dot, success icons |
| `status-warning` | `#F5A623` | Rate limit message |
| `status-failed` | `#F0554C` | Validation error |
| `ring` | `0 0 0 2px rgba(123,92,255,0.55)` | Focus ring |

Type sizes are a closed set: 12, 13, 14, 16, 20, 28, 40 px. Geist for UI, Geist Mono for technical values and never below 12 px. Radius 12 px for containers and controls, 8 px for the pill and the desktop button. Disabled is opacity 0.42 with `cursor: not-allowed`. No shadows on cards, no emoji, no exclamation marks, sentence case.

## Motion

All transitions use `cubic-bezier(.2,.6,.25,1)`: 120 ms for hover and focus, 180 ms for fades.

- **Pill typing:** `git push origin main` types from 300 ms at 45 ms per character. Once complete and after 1600 ms in total, the green `live` label fades in over 180 ms.
- **Pulse:** a ring grows from the dot's radius (3 to 8 for live, 5 to 11 for the submitted dot) while its stroke fades from 0.7 to 0, over 2600 ms, looping.
- With `prefers-reduced-motion: reduce` the pill renders finished and nothing pulses.

## Page shell

- Column of `min-height: 100vh`, background `#050509`, text `#F1F0F4`, `color-scheme: dark`.
- **Header:** 56 px high, the 24 px logo mark centred, linking home.
- **Main:** centred column, max 540 px, gap 40 px, text centred. Padding `56px 16px 88px` mobile, `120px 24px 160px` desktop.

## Waitlist page

**Pill:** inline-flex, gap 8, height 32, padding `0 12px`, radius 8, card fill, hairline border, Geist Mono 12 px weight 500, tracking -0.01em. `$` faint, command primary, `live` in status-live with a 10 px dot and 6 px gap. Hidden from screen readers.

**Heading block:** gap 12. `h1` 40 px, weight 600, line height 1.1, tracking -0.025em. Subline 16 px, weight 400, line height 1.5, muted.

**Form:** column with gap 12. Labels are visually hidden ("First name, optional", "Email").

- **Mobile:** fields stacked with gap 8. Each field 48 px high, padding `0 14px`, radius 12, card fill, 1 px border. Name in Geist 16 px weight 500, email in Geist Mono 16 px weight 500 tracking -0.01em. Button 48 px, radius 12, accent fill, white Geist 14 px weight 600, full width.
- **Desktop:** a single bar, padding 4, gap 4, radius 12, card fill, 1 px border. Name 140 px wide, 40 px high, padding `0 12px`, Geist 13 px. Divider 1 × 20 px in `#1A1922`. Email flexible, Geist Mono 13 px. Button 40 px high, padding `0 20px`, radius 8.
- **Borders:** idle `#1A1922`; focused `#7B5CFF` plus ring; invalid `#F0554C` without ring. On desktop the bar takes the border and ring; on mobile each field does.
- **Error line:** 13 px, weight 500, line height 1.5, `role="alert"`, linked with `aria-describedby`. Red for validation, amber for the rate limit (fields stay neutral).
- **Fine print:** 13 px, weight 400, faint, with a muted `Privacy` link.
- **Button:** disabled (opacity 0.42) while the email is empty and during a rate limit.

**Result tiles** (submitted, confirmed, already in): column, gap 8. Tile 56 × 56, radius 12, card fill, hairline, 16 px below it, icon 22 px with 2 px stroke. Title 20 px weight 600 line height 1.35 tracking -0.01em. Text 14 px weight 400 line height 1.55 muted.

| State | Icon | Notes |
| --- | --- | --- |
| Empty | none | Button disabled |
| Focus | none | Email focused, accent border and ring |
| Error | none | Values kept, red border, message, focus back to the email |
| Rate limited | none | Amber message, neutral fields, button disabled |
| Submitted | Lucide `mail`, primary | 14 px accent dot top right (-5 px) with 2 px `#050509` stroke and pulse. Address in Geist Mono 13 px primary. `Typo?` is a link-coloured underlined button that resets the form and focuses the email |
| Confirmed | Lucide `check`, live green | Threads and GitHub secondary buttons, padding-top 16 |
| Already in | Lucide `check-check`, live green | |

**Secondary button:** inline-flex, gap 6, height 48 mobile / 40 desktop, padding `0 16px`, radius 12, border `#26242F`, card fill, 14 px weight 500, Lucide `arrow-up-right` 14 px. Hover fill `#121218`.

## Centred message pages

Unsubscribe confirm, unsubscribed, invalid link, broken confirmation link, 404 and 500.

- Main padding `48px 16px 88px` mobile, `96px 24px 144px` desktop.
- Column max 460 px, min height 440 px mobile / 520 px desktop, content vertically centred, gap 8.
- Tile as above with 24 px below it. Icon colour: primary for confirm and 404, live green for done, muted for broken links.
- Title 28 px weight 600 line height 1.2 tracking -0.02em. Text 16 px weight 400 line height 1.55 muted. Links in `#B8A6FF`.
- Buttons 48 px mobile / 40 px desktop. The unsubscribe pair sits in a row with gap 8 and padding-top 24, stacked in a column on mobile. Single buttons get margin-top 24.
- 404 shows the Geist Mono 12 px faint line `404 · not found` above the title. The 500 page uses the same layout.

| Page | Icon |
| --- | --- |
| Unsubscribe confirm | Lucide `mail-minus` |
| Unsubscribed | Lucide `check` |
| Invalid link | Lucide `unlink` |
| 404 and 500 | Lucide `search-x` |

## Imprint and privacy

- Article max 600 px, gap 40. Title block centred, gap 12: `h1` 40 px as on the main page, subline 16 px muted.
- Imprint sections: gap 8, heading 12 px weight 500 tracking 0.04em uppercase muted, body 16 px line height 1.65 (address and contact primary, liability and copyright muted).
- Privacy: Geist Mono 12 px faint date under the subline. Sections with 20 px weight 600 headings, body 16 px line height 1.65 muted, links `#B8A6FF`.

## Footer

- Border-top hairline, max 1180 px. Grid gap `40px 24px`.
- Mobile: padding `48px 16px 32px`, two columns, brand block spans both. Desktop: padding `72px 24px 40px`, columns `4fr 1fr 1fr`.
- Brand block, gap 16: 20 px logo mark plus `Velve` 16 px weight 600 with 8 px gap, tagline 14 px muted max 300 px, `hello@velve.dev` Geist Mono 13 px.
- Columns, gap 12: head 12 px weight 500 tracking 0.04em uppercase muted; links 14 px weight 500 primary, link colour on hover, external links with a 14 px arrow.
- Bottom row spans all columns: padding-top 24, hairline above, Geist Mono 12 px muted, wrap with space-between and gap `8px 24px`. Cookie sentence left, `© 2026 Levo Studio` with a 12 px arrow right.
- Wordmark: SVG `viewBox="0 0 1000 290"`, text `velve` at x 500 y 340, font size 440, weight 600, `textLength` 1000, fill `#0D0D13`, stroke `#26242F` 1.2 non-scaling. Side padding 16 mobile / 24 desktop, hidden from screen readers, clipped at the bottom.

## Emails

- One column, max 480 px, on `#050509`. Outer padding 64/40 on wide clients, 48/24 on narrow ones. Gap 40 between logo, body and footer, 24 inside the body.
- Logo mark 24 px. Update mails start with a Geist Mono 12 px muted line.
- Title 28 px weight 600. `Hey {GREETING},` 16 px weight 500 primary. Body 16 px weight 400 line height 1.6 muted.
- Button 48 px high, padding `0 28px`, radius 12, accent fill, white 14 px weight 600, full width on narrow clients.
- Update sections, gap 32: Geist Mono 12 px primary label, then the body.
- Sign-off with padding-top 8, then `The Velve Team` in weight 600 primary.
- Footer: padding-top 24, hairline above, gap 12. Links 14 px weight 500 primary separated by `/` in `#26242F`. Fine print 12 px faint, links muted.
