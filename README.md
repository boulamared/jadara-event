# Vente solidaire Jadara · Agile en Med 2026

Landing page for the 12 December 2026 charity auction. Visitors browse the lots, like
("coup de cœur") the ones they want, and leave their contact details once.

- **Site**: Astro on a Node server (Docker). Routes: the page, `/api/like`, `/healthz`.
- **Content**: Sanity (hosted CMS) for lots, artists, categories and page texts.
  With no Sanity project configured, the site builds from `src/data/seed.json`.
- **Contacts**: each like is saved as a document in the same Sanity project. Marketing reads
  them in the Studio's **Contacts** tab (table, ranking per lot, CSV export).

## Run locally

```bash
npm install
npm run dev
```

With no `.env`, content comes from the seed file and likes are written to `.data/leads.jsonl`.

## Go live

### 1. Content (Sanity)

1. Create a project at sanity.io (free plan) and note the project ID.
2. Create an API token with Editor rights (API › Tokens). It is used for the import and by the
   site to save likes.
3. Copy `.env.example` to `.env`, fill `SANITY_PROJECT_ID` and `SANITY_WRITE_TOKEN`, then run
   `npm run seed`. It imports the 40 lots, 22 artists, 5 categories and the page texts.
   It never overwrites documents that already exist, so it is safe to run again.
4. Deploy the editing interface for marketing:
   ```bash
   cd studio
   cp .env.example .env   # set SANITY_STUDIO_PROJECT_ID
   npm install
   npm run deploy
   ```
   Invite the marketing team from the Sanity project's Members page.

### 2. Contacts

Nothing more to set up. The site writes likes with the same `SANITY_WRITE_TOKEN`, and they show
up live in the Studio under **Contacts**. Anyone invited to the Sanity project can see them, so
invite only the people allowed to see contact data (loi 09-08).

### 3. Hosting (VPS with Docker and Caddy)

The site runs as one container (`Dockerfile`). The page is rendered on request with the Sanity
content cached for 60 s, so a change published in the Studio is live within about a minute, with
no rebuild and no webhook.

1. Copy the project to the VPS (without `node_modules` and `studio/`), for example into
   `~/apps/jadara/`, then create `~/apps/jadara/.env` on the server:
   ```
   SANITY_PROJECT_ID=...
   SANITY_DATASET=production
   SANITY_WRITE_TOKEN=...      # server only
   SITE_URL=https://jadara.yourdomain.com
   ```
2. Add the `jadara` service from `deploy/docker-compose.example.yml` to the compose file that
   already runs Caddy. Match the network name Caddy and your other sites share.
3. Add the site block from `deploy/Caddyfile.snippet` to your Caddyfile, with your subdomain,
   and point that subdomain's DNS A record at the VPS.
4. Build and start, then reload Caddy:
   ```bash
   docker compose up -d --build jadara
   docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```
5. Check `https://jadara.yourdomain.com/healthz` answers `ok`.

To update the site later: copy the new files, then `docker compose up -d --build jadara`.

#### Automatic deploys (GitHub Actions)

`.github/workflows/deploy.yml` runs on every push to `main`: it checks that the site builds, copies
the code to the VPS over SSH (rsync), runs `docker compose up -d --build jadara` there, then calls
`/healthz` on the public URL and fails if the site does not answer. The server's `.env` is never
overwritten and never leaves the VPS.

One-time setup:

1. On your machine, create a dedicated key for deploys and add its public half to the VPS user's
   `~/.ssh/authorized_keys`:
   ```bash
   ssh-keygen -t ed25519 -f jadara_deploy -N "" -C "github-actions-jadara"
   ssh-copy-id -i jadara_deploy.pub USER@VPS_HOST
   ```
2. Capture the server's host key so the workflow can verify it is talking to your VPS:
   ```bash
   ssh-keyscan -t ed25519 VPS_HOST
   ```
3. In GitHub, repository Settings › Secrets and variables › Actions, add:

   | Type | Name | Value |
   |---|---|---|
   | Secret | `VPS_HOST` | VPS address |
   | Secret | `VPS_USER` | SSH user |
   | Secret | `VPS_SSH_KEY` | contents of the private file `jadara_deploy` |
   | Secret | `VPS_KNOWN_HOSTS` | output of the `ssh-keyscan` command |
   | Variable | `VPS_APP_DIR` | project folder on the VPS, e.g. `/home/deploy/apps/jadara` |
   | Variable | `SITE_URL` | public address, e.g. `https://jadara.yourdomain.com` |
   | Variable (optional) | `VPS_COMPOSE_DIR` | folder of the compose file; default: the parent of `VPS_APP_DIR` |
   | Variable (optional) | `VPS_PORT`, `VPS_SERVICE` | default `22` and `jadara` |

   Then delete the private key file from your machine, or keep it somewhere safe.
4. Create `VPS_APP_DIR` on the server and put the production `.env` in it (see step 1 above).
5. The VPS needs `rsync` and Docker Compose installed.

The deploy job uses a GitHub environment named `production`; in Settings › Environments you can add
a required reviewer if you want a manual approval before each deploy.

The Studio does not need the VPS: `cd studio && npm run deploy` hosts it for free at
`something.sanity.studio`.

## How likes are stored

One Sanity document per person and per lot (`_type: "lead"`), with first name, last name, e-mail,
lot, artwork, artist and the time consent was given. Liking the same lot twice does not create a
duplicate; removing a like deletes the document, so the Contacts tab always shows current interest.

Lead document ids start with `lead.`. In Sanity, a document whose id contains a dot is never
readable without being signed in, even when the rest of the dataset is public, so contacts are
not exposed through the public content API.

If Sanity cannot be reached, the visitor sees an error and the like is not shown as saved.
In production with no token configured, the endpoint fails on purpose instead of dropping data.

## Layout

```
src/pages/index.astro     page markup, rendered on request (content cached 60 s)
src/pages/api/like.ts     validation, anti-spam, saves the like
src/pages/healthz.ts      health check for Docker
src/lib/content.ts        Sanity query with seed fallback
src/lib/leads.ts          saves likes to Sanity, rate limit
src/scripts/app.js        filters, lot sheets, likes, contact form
src/styles/site.css       design tokens and styles
Dockerfile, deploy/       container image, compose and Caddy snippets
src/data/seed.json        initial content (from the marketing prototype)
studio/                   Sanity Studio, schemas and the Contacts tab
scripts/seed-sanity.mjs   one-off import into Sanity
```
