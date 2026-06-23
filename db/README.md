# Local database (runtime)

Collection files are created here at runtime when using offline / local mode.

All files are stored **encrypted at rest** (AES-256-GCM). On disk you will see an envelope like `{ "v": 1, "algo": "AES-256-GCM", ... }` — not readable plaintext. Set `LOCAL_DB_ENCRYPTION_KEY` in `.env` (see `.env.example`). Legacy plaintext JSON arrays are still read once and re-encrypted on the next save.

Organisation **licence dates** (`trialStartedAt`, `licenseExpiresAt`) are additionally field-encrypted inside org records as opaque `enc:…` strings. The anchor file `secrets/license-anchor.json` is also fully encrypted.

**Do not commit** files under this directory.

Fresh installs start with empty collections. Use **Settings → Backup** to export decrypted `.minds` backups (portable) and restore them — data is re-encrypted on import.
