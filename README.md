## MemGrow

Vocabulary testing app.

### Running Tests

Tests use Testcontainers to run a real PostgreSQL instance. They run in GitHub Actions (using Docker) and locally.

**Local (Docker):**

```bash
pnpm test
```

**Local (Podman):**

```bash
pnpm test:local
```

Ensure Podman is running and the socket is available. The `test:local` script sets `DOCKER_HOST` to the Podman socket and disables Ryuk (which often fails with rootless Podman). If using a custom socket, set `DOCKER_HOST` before running:

```bash
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock
export TESTCONTAINERS_RYUK_DISABLED=true
pnpm test
```
