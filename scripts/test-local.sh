#!/usr/bin/env bash
# Run tests with Podman. Use this for local development with Podman instead of Docker.
# GitHub Actions uses Docker by default (pnpm test).

set -e

# Podman socket - common locations for rootless Podman
if [ -z "$DOCKER_HOST" ]; then
  if [ -n "$XDG_RUNTIME_DIR" ] && [ -S "$XDG_RUNTIME_DIR/podman/podman.sock" ]; then
    export DOCKER_HOST="unix://$XDG_RUNTIME_DIR/podman/podman.sock"
  elif [ -S "/run/user/$(id -u)/podman/podman.sock" ]; then
    export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"
  fi
fi

# Ryuk (container reaper) often fails with Podman rootless - disable it
export TESTCONTAINERS_RYUK_DISABLED=true

exec pnpm exec vitest run "$@"
