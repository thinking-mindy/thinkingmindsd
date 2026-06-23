/**
 * Production entry for the embedded Windows/desktop Next.js standalone server.
 * Spawned by the Tauri shell instead of server.js directly.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadStandaloneEnv(rootDir) {
  const envPath = path.join(rootDir, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadStandaloneEnv(__dirname);

process.env.NODE_ENV = "production";
process.env.NEXT_TELEMETRY_DISABLED = "1";
process.env.TAURI_DESKTOP = "1";
process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";
process.env.PORT = process.env.PORT || "43123";

if (process.platform === "win32") {
  const flags = new Set((process.env.NODE_OPTIONS || "").split(/\s+/).filter(Boolean));
  flags.add("--max-old-space-size=768");
  flags.delete("--enable-source-maps");
  process.env.NODE_OPTIONS = [...flags].join(" ");
  if (!process.env.UV_THREADPOOL_SIZE) {
    process.env.UV_THREADPOOL_SIZE = "4";
  }
}

require(path.join(__dirname, "server.js"));
