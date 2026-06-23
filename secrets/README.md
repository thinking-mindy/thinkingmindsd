# Runtime secrets (not committed)

This folder holds machine-local files generated at runtime:

| File | Purpose |
|------|---------|
| `license-anchor.json` | Tamper-resistant licence registration anchors (AES-256-GCM encrypted on disk) |
| `login-details.enc.json` | Encrypted offline login profiles (desktop / offline mode) |

Org `trialStartedAt` / `licenseExpiresAt` fields in the database are also field-encrypted (opaque `enc:…` strings inside the encrypted collection file).

Copy `license-anchor.json.example` to `license-anchor.json` only if you need a starter file; anchors are normally created automatically on first use.

**Never commit** real files from this directory. Set `LICENSE_ANCHOR_SECRET` in production (see `.env.example`).
