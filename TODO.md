# Roadmap

## Before launch

- [ ] Brevo set up as in [`docs/guide/brevo.md`](docs/guide/brevo.md), including both unsubscribe webhooks and the custom unsubscribe page.
- [ ] Mail test done and recorded, including Apple Mail, Gmail and Outlook.
- [ ] Set `SITE_INDEXABLE=true` on the Scaleway container. The legal review list in the code is empty.
- [ ] Decide ADR 3: the two colours raised for contrast.
- [ ] Umami website created and its ID set.

## Later

- [ ] ALTCHA, self-hosted proof of work, if bots get through the honeypot and fill-time check.
- [ ] A shared store in the EU before running more than one instance.
- [ ] A rate limit on the analytics relay if it ever gets abused.
- [ ] A confirmation button instead of confirming on GET if mail scanners start confirming addresses (ADR 7).
