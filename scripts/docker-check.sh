#!/bin/sh
# Builds the image, starts it, waits until healthy.
set -eu

image=velve-waitlist:check
name=velve-waitlist-check

docker build -f Dockerfile.dokploy -t "$image" .
docker rm -f "$name" >/dev/null 2>&1 || true
docker run -d --name "$name" "$image" >/dev/null
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT

attempt=0
while [ "$attempt" -lt 30 ]; do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$name")
  if [ "$status" = "healthy" ]; then
    user=$(docker exec "$name" id -u)
    if [ "$user" = "0" ]; then
      echo "docker:check failed, container runs as root" >&2
      exit 1
    fi
    echo "docker:check passed"
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 2
done

echo "docker:check failed, container never became healthy" >&2
docker logs "$name" >&2
exit 1
