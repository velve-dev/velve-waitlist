# Contributing

Thanks for looking. Velve is pre-launch and this repository is maintained by Levo Studio, so outside pull requests may sit for a while. Issues are welcome.

## Ground rules

- Everything in the repository is English.
- No comments in code. Name things so they need none. One header line of ten words or fewer per file is the only exception.
- All user-facing copy lives in `src/content/copy.ts` and `emails/`. Approved strings do not change without the maintainer's agreement.
- No secrets in the repository, ever. `.env.example` lists keys without values.
- Nothing in the browser may contact a third party, set a cookie or write to storage.

## Commits

Conventional Commits in the imperative (`feat:`, `fix:`, `docs:` and so on), one change per commit, a subject under about 72 characters, and a body that says why. No trailers, no tool attribution, no emoji. History is never rewritten.

## Hooks

The repository ships a pre-push hook that checks commit identities, refuses trailer-like lines and runs every gate. Turn it on once per clone:

```
git config core.hooksPath .githooks
git config velve.identity 'Your Name <you@example.com>'
```

The identity you set there must match the author and committer of every commit you push.

## Gates

`pnpm verify` runs formatting, lint and unused-code checks, types, the comment, secret and copy checks, unit tests, the build and the end-to-end suite, which covers accessibility, privacy and security headers. A push only goes out when all of them are green.
