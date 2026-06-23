# Thinking Minds ERP

Multi-module business platform (finance, inventory, POS, HR, CRM, and more) with offline/desktop support via Tauri.

## Quick start (development)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Local JSON storage is used by default — no database or `.env` required for basic offline development.

## Production deployment

### 1. Environment variables

Copy `.env.example` to `.env` and set at minimum:

- `LICENSE_ANCHOR_SECRET` — **required** in production (random 32+ byte hex string)
- `LOCAL_DB_ENCRYPTION_KEY` — **required** in production; encrypts all local JSON DB files at rest
- `NEXT_PUBLIC_APP_URL` — your public site URL

For cloud auth, configure Clerk keys. For payments, configure PayNow. See `.env.example` for the full list.

### 2. Do not ship local data

These paths are gitignored and must stay on the server/machine only:

- `db/` — organisation database (AES-256-GCM encrypted JSON files, or synced MongoDB)
- `secrets/` — licence anchors and encrypted offline logins

Use in-app **Backup / Restore** (`.minds` files) to migrate data between environments.

### 3. Build & run

```bash
npm run build
npm run start
```

### 4. Desktop (Tauri / Windows)

**Linux / macOS build host:**

```bash
export LICENSE_ANCHOR_SECRET="$(openssl rand -hex 32)"
export LOCAL_DB_ENCRYPTION_KEY="$(openssl rand -hex 32)"
export NEXT_PUBLIC_OFFLINE_LOGIN_SECRET="$(openssl rand -hex 32)"
npm run tauri:prepare   # standalone server + Windows node.exe + splash
npm run tauri:build
```

**Windows build host (cmd):**

```cmd
set LICENSE_ANCHOR_SECRET=<openssl rand -hex 32>
set LOCAL_DB_ENCRYPTION_KEY=<openssl rand -hex 32>
set NEXT_PUBLIC_OFFLINE_LOGIN_SECRET=<openssl rand -hex 32>
npm run tauri:build:win
```

The installer bundles:

- **Next.js standalone** server (production, `127.0.0.1:43123` only)
- **Windows Node 22** (`node.exe`, no system Node required)
- **Empty `db/` + `secrets/`** scaffolds — no dev data is copied into the installer
- **Per-build `.env`** with encryption secrets (auto-generated if omitted)

Production desktop server tuning (set by the Tauri shell):

- `NODE_ENV=production`, telemetry disabled
- `NODE_OPTIONS=--max-old-space-size=768` (768 MB heap on Windows)
- `UV_THREADPOOL_SIZE=4`, hidden console window, clean shutdown via `taskkill /T`

### 5. Security notes

- `/api/offline-secrets` is owner-authenticated and disabled on production **web** hosts (enabled for desktop builds).
- `/admin/dev` (developer overrides) is disabled when `NODE_ENV=production`.
- Webhook handlers do not log user payloads.
- **Admin → Plan & Usage → Sync licence** posts `companyId`, `orgId`, and `companyName` (from your profile) to `https://www.thinkingminds.co.zw/renew-licence` (override with `LICENSE_SYNC_URL`) and writes encrypted dates locally.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production Next.js build |
| `npm run build:prod` | Production build (`NODE_ENV=production`) |
| `npm run start:prod` | Production server on `127.0.0.1` |
| `npm run seed:plans` | Seed pricing plans (MongoDB / local DB) |
| `npm run tauri:dev` | Tauri desktop dev |
| `npm run tauri:prepare` | Bundle standalone + Windows Node for Tauri |
| `npm run tauri:build` | Desktop installer (Unix prepare) |
| `npm run tauri:build:win` | Full Windows desktop build from cmd |

## Licence

Proprietary — Thinking Minds.
