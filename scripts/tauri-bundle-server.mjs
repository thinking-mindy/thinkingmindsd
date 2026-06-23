/**
 * Prepares Next.js standalone output + Windows Node for the Tauri desktop bundle.
 * Run after `TAURI_BUILD=1 next build`.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scaffoldRuntimeData } from "./scaffold-runtime-data.mjs";

const MINDS_DEFAULT_OFFLINE_LOGIN_SECRET = "thinkingminds-minds-offline-login-v1";
const MINDS_DEFAULT_LOCAL_DB_KEY = "thinkingminds-minds-local-db-v1";
const MINDS_DEFAULT_LICENSE_ANCHOR = "thinkingminds-minds-license-anchor-v1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const resourcesDir = path.join(root, "src-tauri", "resources");
const standaloneDest = path.join(resourcesDir, "standalone");
const nodeDest = path.join(resourcesDir, "node");
const NODE_VERSION = "22.16.0";

function log(msg) {
  console.log(`[tauri-bundle-server] ${msg}`);
}

function rm(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function cp(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function download(url, destFile) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destFile);
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(destFile);
          return download(res.headers.location, destFile).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed (${res.statusCode}): ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

function extractZip(zipPath, extractDir) {
  fs.mkdirSync(extractDir, { recursive: true });
  if (process.platform === "win32") {
    const cmd = `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`;
    execSync(cmd, { stdio: "inherit" });
    return;
  }
  execSync(`unzip -q -o "${zipPath}" -d "${extractDir}"`, { stdio: "inherit" });
}

function resolveDesktopSecrets() {
  const anchor = process.env.LICENSE_ANCHOR_SECRET?.trim();
  const dbKey = process.env.LOCAL_DB_ENCRYPTION_KEY?.trim();
  const offlineLogin = process.env.NEXT_PUBLIC_OFFLINE_LOGIN_SECRET?.trim();

  const resolved = {
    LICENSE_ANCHOR_SECRET: anchor || MINDS_DEFAULT_LICENSE_ANCHOR,
    LOCAL_DB_ENCRYPTION_KEY: dbKey || MINDS_DEFAULT_LOCAL_DB_KEY,
    NEXT_PUBLIC_OFFLINE_LOGIN_SECRET:
      offlineLogin || MINDS_DEFAULT_OFFLINE_LOGIN_SECRET,
    NEXT_PUBLIC_TAURI: "1",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://127.0.0.1:43123",
  };

  if (!anchor || !dbKey || !offlineLogin) {
    log("Using Thinking Minds desktop default secrets (.env in standalone bundle)");
  }

  return resolved;
}

function writeDesktopEnv(standaloneDir, secrets) {
  const lines = [
    "# Auto-generated for desktop production — do not commit",
    `NODE_ENV=production`,
    `HOSTNAME=127.0.0.1`,
    `PORT=43123`,
    `NEXT_TELEMETRY_DISABLED=1`,
    `TAURI_DESKTOP=1`,
    ...Object.entries(secrets).map(([key, value]) => `${key}=${value}`),
  ];
  fs.writeFileSync(path.join(standaloneDir, ".env"), `${lines.join("\n")}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  log("Wrote production .env for embedded server");
}

async function bundleWindowsNode() {
  const target = process.env.TAURI_ENV_TARGET_TRIPLE ?? "";
  const bundleNode =
    target.includes("windows") ||
    process.env.TAURI_BUNDLE_WINDOWS_NODE === "1" ||
    !target;

  if (!bundleNode) {
    log("Skipping Windows Node download (non-Windows target)");
    return;
  }

  rm(nodeDest);
  fs.mkdirSync(nodeDest, { recursive: true });

  const zipName = `node-v${NODE_VERSION}-win-x64.zip`;
  const url = `https://nodejs.org/dist/v${NODE_VERSION}/${zipName}`;
  const zipPath = path.join(resourcesDir, zipName);

  log(`Downloading ${url}`);
  await download(url, zipPath);

  const extractDir = path.join(resourcesDir, "node-extract");
  rm(extractDir);
  extractZip(zipPath, extractDir);

  const extracted = path.join(extractDir, `node-v${NODE_VERSION}-win-x64`);
  fs.copyFileSync(path.join(extracted, "node.exe"), path.join(nodeDest, "node.exe"));
  rm(extractDir);
  fs.unlinkSync(zipPath);
  log("Windows node.exe ready at src-tauri/resources/node/node.exe");
}

function bundleStandalone() {
  const standaloneSrc = path.join(root, ".next", "standalone");
  const staticSrc = path.join(root, ".next", "static");
  const publicSrc = path.join(root, "public");

  if (!fs.existsSync(standaloneSrc)) {
    throw new Error(
      "Missing .next/standalone — run with TAURI_BUILD=1 (output: 'standalone' in next.config.mjs)"
    );
  }

  rm(standaloneDest);
  fs.mkdirSync(standaloneDest, { recursive: true });

  cp(standaloneSrc, standaloneDest);
  fs.mkdirSync(path.join(standaloneDest, ".next"), { recursive: true });
  cp(staticSrc, path.join(standaloneDest, ".next", "static"));

  if (fs.existsSync(publicSrc)) {
    cp(publicSrc, path.join(standaloneDest, "public"));
  }

  scaffoldRuntimeData(standaloneDest);
  log("Scaffolded empty db/ and secrets/ (no dev data shipped)");

  fs.copyFileSync(
    path.join(root, "scripts", "desktop-server.mjs"),
    path.join(standaloneDest, "desktop-server.mjs")
  );

  writeDesktopEnv(standaloneDest, resolveDesktopSecrets());

  log(`Standalone server at ${path.relative(root, path.join(standaloneDest, "desktop-server.mjs"))}`);
}

async function main() {
  bundleStandalone();
  await bundleWindowsNode();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
