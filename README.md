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

### Initial Database Setup

There is no HTTP endpoint to bootstrap the database (an unauthenticated one
would be a real attack surface; an authenticated one can't create the first
user anyway). Use the `pnpm db:seed` CLI script instead, run from a shell
with network access to the target Postgres - this works identically for a
hosted Neon database or a self-hosted one:

```bash
pnpm install   # first time only, to pull in the tsx dev dependency
```

**Vercel + Neon (hosted):**

```bash
POSTGRES_URL="<your Neon connection string>" pnpm db:seed
```

Leave `DB_PROVIDER` unset (defaults to the Neon driver).

**Self-hosted:** see [Self-Hosting with Podman Compose](#self-hosting-with-podman-compose)
below to set up `.env` first, then run `pnpm db:seed` the same way.

Either way, this creates the schema (idempotent - safe to re-run on every
deploy) and interactively prompts for a real admin name/email/password.
Add `--with-demo-data` to additionally insert the hardcoded demo
user/courses/words from `app/lib/seed-data.ts` - local development only,
never on a deployment anyone else can reach.

### Self-Hosting with Podman Compose

MemGrow can run self-hosted against a plain PostgreSQL container instead of
Neon/Vercel. Set `DB_PROVIDER=pg` (see [.env.example](.env.example)) and the
app/seed layer routes through a standard `pg.Pool` instead of the Neon
driver. Leave `DB_PROVIDER` unset for the existing Vercel + Neon deployment

- nothing changes there.

#### Prerequisites

```bash
podman compose version
```

For host-side backup/restore (`scripts/db.backup.sh` / `scripts/db.restore.sh`),
install the Postgres client tools (`pg_dump`/`pg_restore`/`psql`), or use the
`podman compose exec` fallbacks below if you'd rather not.

#### First-time setup

```bash
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD, AUTH_SECRET (openssl rand -base64 32),
# AUTH_URL, and any optional API keys.
# POSTGRES_URL in .env must use `localhost` - it's for host-side tools
# (pnpm dev, backup/restore scripts, db:seed), not the app container itself.
```

#### Build and start

```bash
podman compose up -d --build
podman compose ps
podman compose logs -f app
podman compose logs -f db
```

Open `http://localhost:3000` (or `http://<host>:${APP_PORT}`).

#### Fresh install (no existing backup)

See [Initial Database Setup](#initial-database-setup) above - with `.env`
configured (previous step) and the stack started, run:

```bash
pnpm install   # first time only, to pull in the tsx dev dependency
pnpm db:seed
```

#### Migrating existing data from Vercel/Neon

```bash
# 1. Point .env's POSTGRES_URL at your Neon connection string and run:
./scripts/db.backup.sh

# 2. Point .env's POSTGRES_URL back at localhost:5432 (self-hosted), start
#    the stack, then restore:
podman compose up -d --build
./scripts/db.restore.sh ./DB_BACKUPS/<the-file-from-step-1>
```

#### Connecting to PostgreSQL

```bash
# Via container (no host psql needed)
podman compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# From host, using .env
source .env && psql "$POSTGRES_URL"
```

#### Backup / restore

```bash
./scripts/db.backup.sh
./scripts/db.restore.sh ./DB_BACKUPS/<filename>
```

If you don't want Postgres client tools on the host, use the container
directly instead:

```bash
source .env
FILE=./DB_BACKUPS/memgrow.db.$(date +%D_%T | sed 's/\//_/g' | sed 's/:/-/g')
mkdir -p ./DB_BACKUPS
podman compose exec -T db pg_dump -Fc -x --inserts -v -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$FILE"
```

```bash
source .env
podman compose exec -T db pg_restore --clean --if-exists -j 4 -v -U "$POSTGRES_USER" -d "$POSTGRES_DB" < ./DB_BACKUPS/<filename>
```

#### Stop / restart

```bash
podman compose down          # keep the postgres_data volume
podman compose down -v       # DESTROYS the database volume
podman compose restart app
```

#### Running on boot (systemd Quadlets)

`compose.yml` is convenient for building and manual start/stop, but for an
always-on server, install the [systemd/](systemd/) Quadlet units so systemd
supervises the containers and restarts them on boot:

```bash
mkdir -p ~/memgrow ~/.config/containers/systemd
# Check out (or symlink) the repo at ~/memgrow, with .env configured there.
cp systemd/memgrow-app.env.example systemd/memgrow-app.env
# Edit systemd/memgrow-app.env: keep it in sync with .env's
# POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB.

podman compose build   # produces memgrow-app:latest
cp systemd/*.network systemd/*.container ~/.config/containers/systemd/

systemctl --user daemon-reload
systemctl --user enable --now memgrow-app.service
systemctl --user status memgrow-app.service memgrow-db.service
```

Rootless systemd user services stop when you log out unless linger is
enabled - required for a server that keeps running unattended:

```bash
loginctl enable-linger "$USER"
```

#### Updating

```bash
git pull

# With Quadlets:
podman compose build
systemctl --user restart memgrow-app.service

# Without Quadlets:
podman compose up -d --build
```

#### Exposing this publicly

The compose stack itself has no TLS/reverse-proxy - `AUTH_TRUST_HOST=true`
is already set in `.env.example` so it works behind one. If you expose this
beyond your LAN/VPN, put a reverse proxy (Caddy, Nginx, Traefik, etc.) with
TLS in front of it rather than exposing port 3000 directly.

### Image Generation Providers

Word images (`app/lib/image-provider.ts`) are generated by whichever service
`IMAGE_PROVIDER` selects. All providers are optional and configured entirely
through `.env` - see [.env.example](.env.example) for the full variable
list. `LLM_MODEL` overrides the model name for the active provider; leave it
unset to use that provider's default.

| `IMAGE_PROVIDER` | Service | Required env vars |
| --- | --- | --- |
| `bedrock` (default) | AWS Bedrock | `AWS_REGION`, `AWS_BEARER_TOKEN_BEDROCK` (or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) |
| `vertex` | Google Vertex AI (Imagen) | `VERTEXAI_PROJECT`, `VERTEXAI_LOCATION`, `VERTEXAI_ACCESS_TOKEN` |
| `cloudflare` | Cloudflare Workers AI | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` |
| `gemini` | Google Gemini API | `GEMINI_API_KEY` |

Note: `IMAGE_COUNT` (`app/constants.ts`, currently 4) is how many image
variants are generated per request. Bedrock/Vertex generate all of them in a
single API call; Cloudflare and Gemini don't support that, so the app makes
`IMAGE_COUNT` concurrent calls instead - worth knowing if you're on a
rate-limited free tier.

#### Cloudflare Workers AI

Free tier: 10,000 "Neurons" per day, no credit card required.

1. Sign up or log in at [dash.cloudflare.com](https://dash.cloudflare.com/).
2. Your **Account ID** is shown on the right sidebar of the dashboard's
   Overview page (or any zone's Overview page) - this is
   `CLOUDFLARE_ACCOUNT_ID`.
3. Create an API token at
   [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
   -> "Create Token" -> use the "Workers AI" template (or a custom token
   with "Workers AI - Read" permission). This is `CLOUDFLARE_API_TOKEN`.
4. Set `IMAGE_PROVIDER=cloudflare` in `.env`. Defaults to the
   `@cf/black-forest-labs/flux-1-schnell` model; override with `LLM_MODEL`
   to use a different Workers AI text-to-image model.

#### Google Gemini API

Free tier available with rate limits. Use a personal Google account rather
than a corporate/Workspace one if your organization restricts which models
are usable on Vertex AI (see `vertex` above) - the Gemini Developer API
(`generativelanguage.googleapis.com`) is a separate product from Vertex AI
and is not subject to the same org policy.

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Click "Create API key" (choose "Create key in new project" if you don't
   want it tied to an existing GCP project).
3. Set `GEMINI_API_KEY` in `.env` to the generated key.
4. Set `IMAGE_PROVIDER=gemini` in `.env`. Defaults to the
   `gemini-2.5-flash-image` model; override with `LLM_MODEL` if needed.
