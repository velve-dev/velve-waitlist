<p align="center">
  <img src="docs/assets/velve-logo.png" alt="Velve" width="96" height="96">
</p>

<h1 align="center">Velve</h1>

<p align="center"><strong>Security without shortcuts. Deploys as simple as a git push.</strong></p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue"></a>
  <img alt="Node 24" src="https://img.shields.io/badge/node-24-339933?logo=nodedotjs&amp;logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-12-F69220?logo=pnpm&amp;logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&amp;logoColor=white">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&amp;logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&amp;logoColor=black">
</p>

<p align="center">
  <a href="docs/guide/README.md">Guide</a> ·
  <a href="docs/architecture/README.md">Architecture</a> ·
  <a href="docs/details/reference.md">Reference</a> ·
  <a href="docs/decisions.md">Decisions</a> ·
  <a href="TODO.md">Roadmap</a>
</p>

---

This is the waitlist for Velve, a platform for apps, databases and file storage that deploys with a `git push`. The waitlist is built the way Velve means to work: it keeps no database of its own, sets no cookies, loads nothing from anyone else and stores no addresses in logs. Brevo holds the list, the server only seals links, limits abuse and sends mail through Brevo's API, and every way of leaving the list deletes the address.

## What works today

- The sign-up page with every state from the design, from 375 px up.
- Double opt-in with our own encrypted links, a welcome mail, and an update template for Brevo campaigns.
- Unsubscribing through our link, RFC 8058 one-click requests and Brevo's webhook, each of which deletes the contact.
- Rate limits per network, per mailbox and per day, a honeypot and a minimum fill time, all tunable through the environment.
- A strict content security policy, cookieless self-hosted analytics through our own origin, and a noindex guard until the legal review is done.
- Imprint, privacy, 404 and 500 pages, health routes, and a Dokploy image.

## What is not built

- A store shared between instances. The limiters live in memory, so the app runs as a single instance. More than one needs Valkey.
- Proof-of-work bot protection. ALTCHA is the documented next step.
- Anything outside the waitlist. Velve itself is not in this repository.

## Back these up

`TOKEN_KEY` seals every confirmation and unsubscribe link. Without it, no link that was ever sent works again, so keep it in a password manager as well as in Dokploy.

## Operating conditions

The app runs as one instance behind one Traefik hop on Levo Studio infrastructure, and Brevo is its only external service. The site stays out of search engines until the legal review list in `src/content/legal.ts` is empty and `SITE_INDEXABLE` is `true`.

## Read on

- [Guide](docs/guide/README.md): how the pieces fit together, in full sentences.
- [Architecture](docs/architecture/README.md): requests, flows and trust boundaries as diagrams.
- [Brevo](docs/guide/brevo.md) and [Dokploy](docs/guide/dokploy.md): what to set up where.
- [Reference](docs/details/reference.md): every environment variable, route, gate and log event.
- [Decisions](docs/decisions.md) and [Roadmap](TODO.md).

## License

Copyright (c) 2026 Levo Studio. The code is licensed under the [MIT License](LICENSE). The Velve name, logo and wordmark are not covered by it. Geist and Geist Mono are under the SIL Open Font License.
