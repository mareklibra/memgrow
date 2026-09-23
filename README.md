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
deploy). On a fresh database it interactively prompts for a real admin
name/email/password. On re-run, if an admin already exists, that step is
skipped unless you choose to create another.
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

### Password reset (email)

Forgot password on `/login` emails a one-hour link. If `RESEND_API_KEY` or
`MAIL_FROM` is missing, the app shows that reset email is not available.
Links always use `AUTH_URL` (already required for login). Do not use
Vercel’s preview hostname (`*.vercel.app` for a given deployment) as
`AUTH_URL` unless you intend that deployment to receive the clicks.

#### 1. One-time: Resend + domain (same for Vercel and Docker)

1. Create a [Resend](https://resend.com) account.
2. Add and **verify** the domain you will send from (Resend dashboard →
   Domains). Add the DNS records Resend shows (SPF/DKIM). Until the domain
   is verified, Resend will reject mail. If the API key is set, users still
   see a generic “if that address is in our system…” message — check Resend
   logs or Vercel function logs.
3. Create an API key and copy it once.
4. Set `MAIL_FROM` to an address **on that verified domain**, e.g.
   `MemGrow <noreply@yourdomain.com>`.

#### 2. Vercel (production)

Assume the project is already deployed (Neon `POSTGRES_URL`, `AUTH_SECRET`).

1. Open [vercel.com](https://vercel.com) → your MemGrow project.
2. **Settings → Environment Variables**.
3. Add (Production; add Preview only if you really want preview deploys to
   send mail):
   - `RESEND_API_KEY` — the key from Resend
   - `MAIL_FROM` — the from-address above
   - Confirm **`AUTH_URL`** is the **public production URL**
     (`https://your-app.vercel.app` or your custom domain), **no trailing
     slash**. That host is what appears in the email. If `AUTH_URL` is empty
     or still `http://localhost:3000`, reset will show “not available” or
     send broken links.
4. **Redeploy** (Deployments → ⋮ → Redeploy, or push a commit). New env
   vars do not apply to an already-running deployment until you redeploy.
5. Smoke test: `/login` → Forgot password → a real user email → inbox →
   the link opens `/reset-password` on the **production** host.

Preview deployments: leave Resend unset (the UI shows “not available”)
**or** set `AUTH_URL` to that preview URL if you must test mail there. Do
not point production `AUTH_URL` at a preview URL.

#### 3. Docker / Podman compose / Quadlet

1. In `.env` (never bake these into the image):

   ```
   RESEND_API_KEY=re_...
   MAIL_FROM=MemGrow <noreply@yourdomain.com>
   AUTH_URL=https://your-public-host
   ```

   Use the same Resend domain as above; DNS does not change when you leave
   Vercel.
2. `compose.yml` passes `RESEND_API_KEY` and `MAIL_FROM` through. Env-only
   changes do **not** need an image rebuild: `podman compose up -d` or
   restart the app container.
3. Quadlet: put the same keys in `~/memgrow/.env` (already loaded by
   `memgrow-app.container`).
4. Behind TLS/nginx: set `AUTH_URL` to the **https public** origin; have
   the proxy overwrite `X-Forwarded-For` (or `$remote_addr`). Publishing
   port 3000 with no proxy: the IP rate-limit is spoofable. If the header
   is missing, every client shares one `unknown` bucket (20 requests per
   hour). Per-email caps still apply.

#### 4. Local `pnpm dev` without Resend

Leave `RESEND_API_KEY` and `MAIL_FROM` blank. The UI says reset email is
not available. When `NODE_ENV` is not `production`, a token is still
created for a known user and the reset URL is printed in the **server**
log so you can open `/reset-password` without a mailbox.

### Image Generation Providers

Word images (`app/lib/image-provider.ts`) are generated by whichever service
`IMAGE_PROVIDER` selects. All providers are optional and configured entirely
through `.env` - see [.env.example](.env.example) for the full variable
list. `LLM_MODEL` overrides the model name for the active provider; leave it
unset to use that provider's default.

| `IMAGE_PROVIDER`    | Service                   | Required env vars                                                                         |
| ------------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| `bedrock` (default) | AWS Bedrock               | `AWS_REGION`, `AWS_BEARER_TOKEN_BEDROCK` (or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) |
| `vertex`            | Google Vertex AI (Imagen) | `VERTEXAI_PROJECT`, `VERTEXAI_LOCATION`, `VERTEXAI_ACCESS_TOKEN`                          |
| `cloudflare`        | Cloudflare Workers AI     | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`                                           |
| `gemini`            | Google Gemini API         | `GEMINI_API_KEY`                                                                          |

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
