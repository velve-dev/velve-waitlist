# Architecture

## Components and trust boundaries

```mermaid
flowchart LR
  subgraph Browser
    page[Waitlist page]
  end
  subgraph Levo["Scaleway nl-ams, run by Levo Studio"]
    edge[Scaleway edge<br/>TLS, sets X-Real-IP]
    app[Next.js app<br/>stateless, one instance]
    umami[Umami<br/>analytics.levo-studio.com]
  end
  subgraph Brevo["Brevo (EU)"]
    api[Contacts and transactional API]
    list[(Velve waitlist list)]
    campaigns[Campaigns]
  end
  page -- "same origin only" --> edge --> app
  app -- "api-key, server side" --> api --> list
  app -- "events without client address" --> umami
  campaigns -- "unsubscribe webhook, bearer token" --> edge
```

The browser only ever talks to `velve.dev`. Brevo and Umami are reached from the server. The app keeps nothing on disk. Its only state is the in-memory limiters, which reset on restart.

## Sign-up and confirmation

```mermaid
sequenceDiagram
  actor Person
  participant App as velve.dev
  participant Brevo
  Person->>App: GET / (nonce, sealed form token)
  Person->>App: POST /api/subscribe
  App-->>Person: 200, same answer for every outcome
  App->>Brevo: send confirmation mail with /confirm/<sealed token>
  Note over App,Brevo: no contact exists yet
  Person->>App: GET /confirm/<token>
  App->>Brevo: is the address on the list?
  alt not listed
    App->>Brevo: create contact with attributes
    App->>Brevo: send welcome mail with /unsubscribe/<sealed token>
    App-->>Person: You're in
  else listed
    App-->>Person: You're already in
  end
```

## Leaving the list

```mermaid
flowchart TD
  welcome[Welcome mail link] --> ask["/unsubscribe/&lt;token&gt;<br/>asks once"] --> delete
  oneclick["POST /api/unsubscribe/&lt;token&gt;<br/>RFC 8058"] --> delete
  campaign[Campaign link, Brevo's page] --> redirect["redirect to /unsubscribed"]
  campaign --> webhook["Brevo webhook<br/>POST /api/webhooks/brevo"] --> delete
  delete[Delete contact in Brevo]
```

## Tokens

All link tokens are AES-256-GCM with `TOKEN_KEY`, a random 12-byte IV and the purpose (`confirm`, `unsubscribe`, `form`) as additional authenticated data, so a token for one purpose cannot be used for another. They are base64url in the path, which keeps addresses out of access logs. Confirmation tokens expire after `CONFIRM_TOKEN_TTL_SECONDS`. Unsubscribe tokens do not expire.
