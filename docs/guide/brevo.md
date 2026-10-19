# Brevo

Brevo holds the list and sends every mail. This page records how the account looked when the waitlist was built, what has to be set up before launch, how to run the mail test and how to send an update. Changes in the Brevo account are made by the owner, never by code or agents.

## State of the account on 18 October 2026

- **Plan:** Starter, 5,000 mails a month. Brevo warns the owner about plan limits, and the app adds its own daily cap (`DAILY_SEND_CAP`).
- **Domain and sender:** `velve.dev` is authenticated and branded, with `updates.velve.dev` for tracked links. The sender `Velve <updates@velve.dev>` is verified, and DKIM and DMARC are set up.
- **Per-contact pixel tracking consent:** off, so every contact is tracked.
- **Transactional anonymous email tracking:** off.
- **Retention:** transactional logs are kept for several months, previews included.
- **API keys:** none yet. Keys can be limited in scope and given an expiry date. IP blocking for unknown addresses is off and no addresses are authorised.
- **Lists:** only "Your first list" (ID 2).
- **Unsubscribe page:** Brevo's default page on Brevo's domain.
- **Branding:** the Starter plan adds Brevo branding to mails. The owner accepts this.

## Checklist before launch

1. **Settings › Contacts › Per-contact pixel tracking consent:** set to **Yes**. If "Track contacts whose consent is unknown" appears, set it to **No**.
2. **Transactional emails › Tracking › Anonymous email tracking:** set to **Yes**.
3. **Transactional emails › Retention rules:** choose the shortest duration and **Never store previews**.
4. **Contacts › Lists:** create the list "Velve waitlist" and note its ID for `BREVO_LIST_ID`.
5. **Contacts › Settings › Contact attributes:** create `GREETING` (text), `SIGNUP_AT` (date), `CONFIRMED_AT` (date), `CONSENT_VERSION` (text), `FIRST_DEPLOY` (text), `RUNS_ON` (text) and `ANSWERED_AT` (date). Until the last three exist, votes on the two optional questions fail with `answers_attribute_missing`. `FIRSTNAME` already exists.
6. **SMTP & API › API keys:** create a key with the smallest scope that covers contacts and transactional emails, with an expiry date, and put it into `BREVO_API_KEY`. Then add the outgoing addresses of the Levo servers under **Security › Authorized IPs** and turn on blocking for API keys.
7. **Unsubscribe page:** create a custom unsubscribe page and set its confirmation to redirect to `https://velve.dev/unsubscribed`. Use it in every campaign.
8. **Webhooks:** create two webhooks to `https://velve.dev/api/webhooks/brevo`, both with bearer authentication (`"auth": {"type": "bearer", "token": "<BREVO_WEBHOOK_SECRET>"}`):
   - a **marketing** webhook for the `unsubscribed` event, which deletes contacts who leave through a campaign;
   - a **transactional** webhook for the `unsubscribed` event, which covers Brevo's own `List-Unsubscribe` header in transactional mails.
9. **Account security:** check that two-factor sign-in is on.

Brevo also offers an MCP endpoint under **SMTP & API › API keys & MCP**. The waitlist does not use it, and it should stay off unless there is a reason to let an assistant act in the account.

## What tracking means at Brevo

With `contactPixelTrackingConsent: false` on each recipient and per-contact consent switched on, Brevo anonymises opens and clicks and only counts them in totals. The tracking pixel and the rewritten links through `updates.velve.dev` stay in the mail. That is why no text on the site or in the mails says "no tracking pixel" or "not tracked". The privacy policy says: "Brevo counts email opens and clicks only anonymously, as totals that are never linked to you."

## Mail test before launch

Do this once the checklist is done and again after any change to the templates or the Brevo settings.

1. Sign up on the deployed site with a test mailbox and a first name. Confirm, then unsubscribe through the welcome mail.
2. Send a test campaign from the update template to the same mailbox, then unsubscribe through Brevo's link.
3. For each of the three mails, open the raw source and record:
   - whether a tracking pixel is present, and whether it carries a per-contact identifier;
   - whether links are rewritten through `updates.velve.dev`, and whether the rewritten links identify the contact;
   - the `List-Unsubscribe` and `List-Unsubscribe-Post` headers and where they point;
   - any Brevo branding added to the body.
4. Check in Brevo that the contact was deleted, not just blocked, after each unsubscribe path, including the webhook paths.
5. Render the mails in Apple Mail, Gmail on the web and in the app, and Outlook, and note anything that breaks the dark layout.

If anything contradicts a sentence on the site, in the mails or in the privacy policy, stop and decide before launch. Record the results here.

| Check                              | Confirmation   | Welcome        | Update         |
| ---------------------------------- | -------------- | -------------- | -------------- |
| Pixel present, identifies contact  | not yet tested | not yet tested | not yet tested |
| Link rewriting, identifies contact | not yet tested | not yet tested | not yet tested |
| `List-Unsubscribe` target          | not yet tested | not yet tested | not yet tested |
| Branding                           | not yet tested | not yet tested | not yet tested |
| Apple Mail                         | not yet tested | not yet tested | not yet tested |
| Gmail web and app                  | not yet tested | not yet tested | not yet tested |
| Outlook                            | not yet tested | not yet tested | not yet tested |

## Sending an update

Updates go out every few weeks as Brevo campaigns to the list "Velve waitlist".

1. Run `pnpm emails:build` if the layout changed, then open `emails/update.html`.
2. In Brevo, create a campaign with the HTML editor ("Paste your code") and paste the file.
3. Replace the placeholders: `{n}`, `{title}` and `{month year}` in the subject and the first lines, and the three bracketed paragraphs under `shipped`, `broke` and `next`. Leave `{{ contact.GREETING }}` and `{{ unsubscribe }}` as they are, because Brevo fills them in.
4. Subject: `Velve update {n} · {title}`. Sender `Velve <updates@velve.dev>`, reply-to `hello@velve.dev`.
5. Choose the custom unsubscribe page from the checklist, send a test to yourself, then send.
