# Scaleway

The waitlist runs as one Scaleway Serverless Container in the Amsterdam region (`nl-ams`), in the Levo Studio Production project. Everything in this page is set by the owner in Scaleway, DNScale and GitHub. Agents never change the container, its secrets or the DNS records without the owner's confirmation.

## Flow

1. A push to `main` runs CI, and `.github/workflows/deploy.yml` builds `Dockerfile.dokploy` once CI is green.
2. The image is pushed to GHCR as `ghcr.io/velve-dev/velve-waitlist` and to the private Scaleway registry as `rg.nl-ams.scw.cloud/levo-studio/velve-waitlist`, each with the tags `latest` and the commit SHA.
3. The workflow checks with `docker buildx imagetools inspect` that both images are there and that `latest` points to the same digest as the SHA tag.
4. Only then, and only once the repository variable `SCW_CONTAINER_ID` is set, does it point the container at the SHA tag through the Serverless Containers API and wait until Scaleway reports `ready` with that image. `error` or a timeout fails the job.

## Container

- **Image:** `rg.nl-ams.scw.cloud/levo-studio/velve-waitlist:<sha>`. The first image exists after the first green run on `main`. Create the container from it, then set `SCW_CONTAINER_ID`, and every later run deploys on its own.
- **Port:** 8674.
- **Resources:** 250 mVCPU and 512 MB.
- **Scaling:** minimum 1, maximum 1. The rate limiters live in memory, so a second instance would double every limit. More than one instance needs a shared store first.
- **Health check:** HTTP on `/api/health`. Monitoring can use `GET /api/health/detailed` with `Authorization: Bearer <HEALTH_TOKEN>`.
- **Security:** public, HTTPS only. No Private Network is needed: the app has no database and only talks to Brevo and Umami over HTTPS.
- **Logs:** the app logs no email addresses, names or IP addresses. Scaleway Cockpit keeps the container's own output and nothing else from this app.

## Client address and rate limits

Scaleway sets `X-Real-IP` to the address that connected and overwrites any value the client sends, so the limiters key on it first and only fall back to the last `X-Forwarded-For` entry when it is missing. Behind Scaleway, `X-Forwarded-For` can end with an internal proxy hop.

Scaleway has no per-address rate limit in front of the container, so the Traefik limit on `/api/*` is gone. The app's own limits stay: per network for sign-ups, per mailbox for confirmation mails, per day for all mails, and per network for link and webhook routes.

## Domains

- `www.velve.dev`: a CNAME at DNScale to the container's `functions.fnc.nl-ams.scw.cloud` endpoint, added as a custom domain on the container.
- `velve.dev`: an ALIAS at DNScale to the same endpoint, also added as a custom domain.
- TTL 300 for both, so a later change takes effect within minutes.

## Environment

Set every key from `.env.example` on the container: secrets as secrets, tunables as environment variables. The [reference](../details/reference.md) explains each one. Generate the secrets on a trusted machine:

```
openssl rand -base64 32
openssl rand -hex 32
```

The first gives `TOKEN_KEY`. The second, run once per key, gives `RATE_LIMIT_SALT_SECRET`, `BREVO_WEBHOOK_SECRET` and `HEALTH_TOKEN`. Moving from Dokploy, copy the existing values instead of generating new ones. Keep `TOKEN_KEY` in a password manager as well. Losing or changing it breaks every confirmation and unsubscribe link ever sent.

## GitHub

- Secret `SCW_SECRET_KEY`: the secret key of a Scaleway IAM application that may push to the registry namespace `levo-studio` and update this container.
- Variable `SCW_CONTAINER_ID`: the ID of the container. While it is empty, the workflow only publishes the image.
- The workflow pushes to GHCR with the built-in `GITHUB_TOKEN`, so it needs `packages: write`, which the workflow requests itself.
