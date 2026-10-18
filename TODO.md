# Roadmap

## Before launch

- [ ] Brevo set up as in [`docs/guide/brevo.md`](docs/guide/brevo.md), including both unsubscribe webhooks and the custom unsubscribe page.
- [ ] Mail test done and recorded, including Apple Mail, Gmail and Outlook.
- [ ] Release the sentence on anonymous open and click counting in the privacy policy after the mail test.
- [ ] Name the data centre operators behind Levo Studio's servers in the privacy policy.
- [ ] Confirm the 7-day log retention in Dokploy and Traefik.
- [ ] Check Brevo's address against the current data processing agreement.
- [ ] Legal review of imprint and privacy, then empty `pendingLegalReview` and set `SITE_INDEXABLE=true`.
- [ ] Decide ADR 3: the two colours raised for contrast.
- [ ] Umami website created and its ID set.

## Later

- [ ] ALTCHA, self-hosted proof of work, if bots get through the honeypot and fill-time check.
- [ ] Valkey on Levo infrastructure before running more than one instance.
- [ ] A rate limit on the analytics relay if it ever gets abused.
- [ ] A confirmation button instead of confirming on GET if mail scanners start confirming addresses (ADR 7).
