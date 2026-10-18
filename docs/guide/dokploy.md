# Dokploy

The waitlist runs as one container on Levo Studio's Dokploy cluster. Everything in this page is set by the owner in Dokploy and GitHub. Agents never call the deploy webhook or change Dokploy.

## Flow

1. A push to `main` runs CI, and `.github/workflows/deploy.yml` builds `Dockerfile.dokploy`.
2. The image is pushed to GHCR as `ghcr.io/velve-dev/velve-waitlist` with the tags `latest` and the commit SHA.
3. The workflow checks with `docker buildx imagetools inspect` that the image is there.
4. Only then does it call the `DEPLOYMENT_WEBHOOK_URL` secret, and Dokploy pulls `latest`. A non-2xx answer fails the job.

## Application

- **Source:** Docker image `ghcr.io/velve-dev/velve-waitlist:latest`. While the package is private, Dokploy needs a registry credential with read access to GHCR.
- **Port:** 8674, inside the container and in the domain settings.
- **Domain:** `velve.dev` with HTTPS through Traefik.
- **Replicas:** one. The rate limiters live in memory. A second instance needs Valkey on Levo infrastructure first.
- **Health check:** the image declares one on `GET /api/health`. Monitoring can use `GET /api/health/detailed` with `Authorization: Bearer <HEALTH_TOKEN>`.
- **Logs:** the app logs no email addresses, names or IP addresses, and Traefik access logs stay off for this app. The privacy policy relies on both.

## Environment

Set every key from `.env.example` in Dokploy. The [reference](../details/reference.md) explains each one. Generate the secrets on a trusted machine:

```
openssl rand -base64 32   # TOKEN_KEY
openssl rand -hex 32      # RATE_LIMIT_SALT_SECRET, BREVO_WEBHOOK_SECRET, HEALTH_TOKEN
```

Keep `TOKEN_KEY` in a password manager as well. Losing it breaks every confirmation and unsubscribe link ever sent.

## Traefik rate limit

Add a rate-limit middleware for the router of this app, applied to the path prefix `/api/`, with an average of 20 requests per minute and a burst of 10 per client address. In Dokploy this goes into the application's advanced Traefik configuration, for example:

```yaml
http:
  middlewares:
    velve-waitlist-api-limit:
      rateLimit:
        average: 20
        period: 1m
        burst: 10
  routers:
    velve-waitlist-api:
      rule: Host(`velve.dev`) && PathPrefix(`/api/`)
      middlewares:
        - velve-waitlist-api-limit
      service: <the app's service name in Dokploy>
      tls:
        certResolver: letsencrypt
```

The app trusts the last `X-Forwarded-For` entry, which is the address Traefik saw. Keep exactly one proxy hop in front of it, or adjust `src/server/client-ip.ts`.

## GitHub

- Secret `DEPLOYMENT_WEBHOOK_URL`: the Dokploy deploy webhook of this application.
- The workflow pushes to GHCR with the built-in `GITHUB_TOKEN`, so it needs `packages: write`, which the workflow requests itself.
