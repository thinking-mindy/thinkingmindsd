/**
 * Static Next.js export for the Tauri desktop shell (no embedded Node server).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const apiDir = path.join(root, "src", "app", "api");
const buildScratch = path.join(root, ".desktop-build");
const apiBackup = path.join(buildScratch, "api-backup");
const actionsDir = path.join(root, "src", "_actions");
const actionsBackup = path.join(buildScratch, "actions-backup");
const outDir = path.join(root, "out");
const tsconfigPath = path.join(root, "tsconfig.json");
const tsconfigBackup = path.join(root, "tsconfig.desktop.bak");
const planAccessPath = path.join(root, "src", "lib", "plan-access.ts");
const planAccessBackup = path.join(root, "src", "lib", "plan-access.desktop.bak");
const mindsLayoutServer = path.join(root, "src", "app", "(minds)", "MindsLayoutServer.tsx");
const mindsLayoutServerBackup = path.join(buildScratch, "MindsLayoutServer.tsx");
const mindsLayout = path.join(root, "src", "app", "(minds)", "layout.tsx");
const mindsLayoutBackup = path.join(buildScratch, "minds-layout.tsx");
/** @type {{ file: string, content: string }[]} */
const useServerBackups = [];

const env = {
  ...process.env,
  TAURI_BUILD: "1",
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_TAURI: "1",
  NEXT_PUBLIC_OFFLINE_LOGIN_SECRET:
    process.env.NEXT_PUBLIC_OFFLINE_LOGIN_SECRET ||
    "thinkingminds-minds-offline-login-v1",
};

function log(msg) {
  console.log(`[tauri-prepare-out] ${msg}`);
}

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkFiles(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function stripUseServerDirectives() {
  const srcDir = path.join(root, "src");
  for (const file of walkFiles(srcDir)) {
    const content = fs.readFileSync(file, "utf8");
    if (!/['"]use server['"]/.test(content)) continue;
    useServerBackups.push({ file, content });
    const next = content.replace(/^['"]use server['"];?\s*\r?\n/m, "");
    fs.writeFileSync(file, next, "utf8");
  }
  if (useServerBackups.length) {
    log(`Stripped 'use server' from ${useServerBackups.length} file(s)`);
  }
}

function restoreUseServerDirectives() {
  for (const { file, content } of useServerBackups) {
    fs.writeFileSync(file, content, "utf8");
  }
  if (useServerBackups.length) {
    log("Restored 'use server' directives");
  }
  useServerBackups.length = 0;
}

function ensureScratchDir() {
  fs.mkdirSync(buildScratch, { recursive: true });
}

function hideApiRoutes() {
  ensureScratchDir();
  if (fs.existsSync(apiBackup)) {
    fs.rmSync(apiBackup, { recursive: true, force: true });
  }
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, apiBackup);
    log("Temporarily moved src/app/api aside for static export");
  }
}

function restoreApiRoutes() {
  if (fs.existsSync(apiBackup)) {
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    fs.renameSync(apiBackup, apiDir);
    log("Restored src/app/api");
  }
}

function extractExportedNames(source) {
  const names = new Set();
  const patterns = [
    /export\s+async\s+function\s+(\w+)/g,
    /export\s+function\s+(\w+)/g,
    /export\s+const\s+(\w+)\s*=/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      names.add(match[1]);
    }
  }
  return [...names];
}

function extractTypeExports(source) {
  const lines = source.split("\n");
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^export\s+type\s+\{/.test(trimmed) && trimmed.includes(" from ") && trimmed.endsWith(";")) {
      out.push(line);
      continue;
    }

    if (!trimmed.startsWith("export type ") && !trimmed.startsWith("export interface ")) {
      continue;
    }

    let block = line;
    let depth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

    while (depth > 0 && i + 1 < lines.length) {
      i += 1;
      block += `\n${lines[i]}`;
      depth += (lines[i].match(/\{/g) || []).length;
      depth -= (lines[i].match(/\}/g) || []).length;
    }

    out.push(block);
  }

  return out.join("\n\n");
}

function sanitizeTypesForStub(typeBlock) {
  return typeBlock.replace(/\bObjectId\b/g, "string");
}

function stubActionFile(fileName, source) {
  const fnNames = extractExportedNames(source);
  const typeBlock = sanitizeTypesForStub(extractTypeExports(source));
  const fns = fnNames
    .map(
      (name) => `export async function ${name}(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: ${name} is not available until this module is migrated to Rust.' };
}`
    )
    .join("\n\n");

  return `/** Auto-generated desktop stub for ${fileName} */\n${typeBlock}\n\n${fns}\n`;
}

function patchTsconfigForDesktop() {
  const content = fs.readFileSync(tsconfigPath, "utf8");
  fs.writeFileSync(tsconfigBackup, content, "utf8");
  fs.writeFileSync(
    tsconfigPath,
    content.replace(
      '"@/*": ["./src/*"]',
      '"@/*": ["./src/*"],\n      "@/lib/auth/server": ["./src/lib/auth/server-shim.ts"]'
    ),
    "utf8"
  );
  log("Patched tsconfig auth server shim for desktop build");
}

function restoreTsconfigFromBackup() {
  if (fs.existsSync(tsconfigBackup)) {
    fs.copyFileSync(tsconfigBackup, tsconfigPath);
    fs.unlinkSync(tsconfigBackup);
    log("Restored tsconfig.json");
  }
}

function patchMindsLayoutForDesktop() {
  ensureScratchDir();
  fs.copyFileSync(mindsLayout, mindsLayoutBackup);

  if (fs.existsSync(mindsLayoutServer)) {
    if (fs.existsSync(mindsLayoutServerBackup)) {
      fs.rmSync(mindsLayoutServerBackup, { force: true });
    }
    fs.renameSync(mindsLayoutServer, mindsLayoutServerBackup);
  }

  fs.writeFileSync(
    mindsLayout,
    `import MindsLayoutClient from "./MindsLayoutClient";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MindsLayoutClient>{children}</MindsLayoutClient>;
}
`,
    "utf8"
  );
  log("Patched (minds)/layout.tsx for desktop static export");
}

function restoreMindsLayoutForDesktop() {
  if (fs.existsSync(mindsLayoutBackup)) {
    fs.copyFileSync(mindsLayoutBackup, mindsLayout);
    fs.unlinkSync(mindsLayoutBackup);
    log("Restored (minds)/layout.tsx");
  }
  if (fs.existsSync(mindsLayoutServerBackup)) {
    if (fs.existsSync(mindsLayoutServer)) {
      fs.rmSync(mindsLayoutServer, { force: true });
    }
    fs.renameSync(mindsLayoutServerBackup, mindsLayoutServer);
    log("Restored MindsLayoutServer.tsx");
  }
}

function stubPlanAccess() {
  if (!fs.existsSync(planAccessPath)) return;
  fs.copyFileSync(planAccessPath, planAccessBackup);
  fs.writeFileSync(
    planAccessPath,
    `import type { ModulePath } from './plan-modules';

export type ModuleAccessResult = {
  hasAccess: boolean;
  planSlug?: string;
  planName?: string;
  licenseExpired?: boolean;
};

export async function hasModuleAccess(_modulePath: ModulePath): Promise<ModuleAccessResult> {
  return { hasAccess: true, planSlug: 'free', planName: 'Free Trial' };
}

export async function getUserPlan() {
  return null;
}
`,
    "utf8"
  );
  log("Stubbed src/lib/plan-access.ts");
}

function restorePlanAccess() {
  if (fs.existsSync(planAccessBackup)) {
    fs.copyFileSync(planAccessBackup, planAccessPath);
    fs.unlinkSync(planAccessBackup);
    log("Restored src/lib/plan-access.ts");
  }
}

function stubInfoActions() {
  const infoActions = path.join(root, "src", "app", "info", "actions.ts");
  const backup = path.join(root, "src", "app", "info", "actions.desktop.bak");
  if (!fs.existsSync(infoActions)) return;
  fs.copyFileSync(infoActions, backup);
  fs.writeFileSync(
    infoActions,
    `/** Auto-generated desktop stub */\nexport async function createCompany(..._args: unknown[]) {
  return { error: 'Not available in desktop app' };
}
export async function requestToJoinCompany(..._args: unknown[]) {
  return { error: 'Not available in desktop app' };
}
`,
    "utf8"
  );
  log("Stubbed src/app/info/actions.ts");
}

function restoreInfoActions() {
  const infoActions = path.join(root, "src", "app", "info", "actions.ts");
  const backup = path.join(root, "src", "app", "info", "actions.desktop.bak");
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, infoActions);
    fs.unlinkSync(backup);
    log("Restored src/app/info/actions.ts");
  }
}

function swapActionsForStubs() {
  if (!fs.existsSync(actionsDir)) return;
  ensureScratchDir();
  if (fs.existsSync(actionsBackup)) {
    fs.rmSync(actionsBackup, { recursive: true, force: true });
  }
  fs.renameSync(actionsDir, actionsBackup);
  fs.mkdirSync(actionsDir, { recursive: true });

  for (const file of fs.readdirSync(actionsBackup)) {
    if (!file.endsWith(".ts")) continue;
    const source = fs.readFileSync(path.join(actionsBackup, file), "utf8");
    fs.writeFileSync(
      path.join(actionsDir, file),
      stubActionFile(file, source),
      "utf8"
    );
  }
  log(`Generated desktop stubs for src/_actions (${fs.readdirSync(actionsDir).length} files)`);
}

function restoreActionsFromBackup() {
  if (!fs.existsSync(actionsBackup)) return;
  if (fs.existsSync(actionsDir)) {
    fs.rmSync(actionsDir, { recursive: true, force: true });
  }
  fs.renameSync(actionsBackup, actionsDir);
  log("Restored src/_actions");
}

function runStaticBuild() {
  const nextDir = path.join(root, ".next");
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    log("Cleared .next cache");
  }
  log("Running Next.js static export (output: export)…");
  execSync("npm run build", {
    cwd: root,
    stdio: "inherit",
    env,
  });
}

function verifyOutDir() {
  const index = path.join(outDir, "index.html");
  const signIn = path.join(outDir, "sign-in", "index.html");
  if (!fs.existsSync(index)) {
    throw new Error("Static export missing out/index.html");
  }
  if (!fs.existsSync(signIn)) {
    throw new Error("Static export missing out/sign-in/index.html");
  }
  log(`Static UI ready at ${path.relative(root, outDir)}/`);
}

function main() {
  hideApiRoutes();
  patchTsconfigForDesktop();
  patchMindsLayoutForDesktop();
  swapActionsForStubs();
  stubPlanAccess();
  stubInfoActions();
  stripUseServerDirectives();
  try {
    runStaticBuild();
    verifyOutDir();
  } finally {
    restoreUseServerDirectives();
    restorePlanAccess();
    restoreMindsLayoutForDesktop();
    restoreInfoActions();
    restoreActionsFromBackup();
    restoreTsconfigFromBackup();
    restoreApiRoutes();
  }
}

main();
