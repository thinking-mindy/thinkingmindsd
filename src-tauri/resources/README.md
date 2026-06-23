# Tauri bundle resources

Generated during `npm run tauri:prepare` before a desktop build:

- `standalone/` — Next.js standalone server (`desktop-server.mjs`, `server.js`, `.next`, empty `db/`, …)
- `standalone/.env` — production secrets for the embedded server (mode `0600`, gitignored)
- `node/node.exe` — Windows Node 22 runtime (no system Node required)

Do not commit `standalone/`, `node/`, or `.env` (see root `.gitignore`).
