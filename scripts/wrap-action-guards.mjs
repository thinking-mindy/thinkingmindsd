/**
 * Wraps exported server actions with module/auth guards.
 * Run: node scripts/wrap-action-guards.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const actionsDir = path.join(root, "src", "_actions");

const FILE_GUARDS = {
  "pos.ts": { type: "module", module: "pos" },
  "crm.ts": { type: "module", module: "crm" },
  "school.ts": { type: "module", module: "school" },
  "helpdesk.ts": { type: "module", module: "helpdesk" },
  "knowledge-base.ts": { type: "module", module: "helpdesk" },
  "payroll.ts": { type: "anyModule", modules: ["payroll", "hr"] },
  "leave-requests.ts": { type: "module", module: "hr" },
  "projects-tasks.ts": { type: "module", module: "tasks" },
  "inventory-items.ts": { type: "module", module: "inventory" },
  "stock-movements.ts": { type: "module", module: "inventory" },
  "purchase-orders.ts": { type: "module", module: "procurement" },
  "suppliers.ts": { type: "anyModule", modules: ["inventory", "procurement"] },
  "inventory-pos-sync.ts": { type: "anyModule", modules: ["inventory", "pos"] },
  "audit-logs.ts": { type: "module", module: "audit" },
  "notifications.ts": { type: "module", module: "notifications" },
  "currencies.ts": { type: "module", module: "currency" },
  "assets.ts": { type: "module", module: "it" },
  "receipt-design.ts": { type: "anyModule", modules: ["pos", "cashier"] },
  "user-requests.ts": { type: "module", module: "helpdesk" },
  "usage-logs.ts": { type: "anyModule", modules: ["logs", "admin"] },
  "overrides.ts": { type: "ownerOrDeveloper" },
  "overrides-terminal.ts": { type: "ownerOrDeveloper" },
  "i18n.ts": { type: "auth" },
  "logs.ts": { type: "auth" },
};

const FINANCE_CASHIER = new Set([
  "createCashierTransaction",
  "getCashierTransactions",
  "getCashierTransactionsFiltered",
  "getDailyCashSummary",
]);

const ANALYTICS_GUARDS = {
  getFinanceAnalytics: { type: "module", module: "finance" },
  getHRAnalytics: { type: "module", module: "hr" },
  getMarketingAnalytics: { type: "module", module: "crm" },
  getOverviewAnalytics: { type: "hasModules" },
  getInventoryAndPOSAnalytics: { type: "anyModule", modules: ["inventory", "pos"] },
};

const PAYMENTS_GUARDS = {
  getPaymentsForOrg: { type: "module", module: "admin" },
  getPaymentsForCurrentOrg: { type: "module", module: "admin" },
  initiatePlanPayment: { type: "owner" },
  initiatePOSPayNowPayment: { type: "module", module: "pos" },
  checkPlanPaymentStatus: { type: "owner" },
};

const ORGS_GUARDS = {
  createOrg: { type: "auth" },
  getOrg: { type: "auth" },
  getAllOrgs: { type: "owner" },
  searchOrgs: { type: "auth" },
  updateOrg: { type: "owner" },
  updateOrgPlan: { type: "owner" },
  ensureOrgsHavePlans: { type: "owner" },
  deleteOrg: { type: "owner" },
};

const PLANS_GUARDS = {
  ensureDefaultPlans: { type: "auth" },
  seedDefaultPlans: { type: "owner" },
  createPlan: { type: "owner" },
  getPlan: { type: "auth" },
  getPlanBySlug: { type: "auth" },
  getAllPlans: { type: "auth" },
  updatePlan: { type: "owner" },
  deletePlan: { type: "owner" },
};

const USERS_GUARDS = {
  createUser: { type: "auth" },
  updateUser: { type: "owner" },
  updateUserRole: { type: "owner" },
  updateUserAllowedModules: { type: "owner" },
  deleteUser: { type: "owner" },
  getMembers: { type: "module", module: "admin" },
  getMembersDep: { type: "module", module: "admin" },
  getActive: { type: "module", module: "admin" },
  getUserAtivity: { type: "module", module: "admin" },
};

const JOIN_GUARDS = {
  createJoinRequest: { type: "auth" },
  getJoinRequestsByOrg: { type: "owner" },
  getJoinRequestsForCurrentOrg: { type: "owner" },
  getJoinRequestsByUser: { type: "auth" },
  approveJoinRequest: { type: "owner" },
  rejectJoinRequest: { type: "owner" },
};

const LICENSES_GUARDS = {
  getLicenseStatus: { type: "auth" },
  getLicenseStatusForCurrentUser: { type: "auth" },
  extendLicense: { type: "owner" },
  refreshLicenseFromRemoteMongo: { type: "owner" },
};

function guardImport(guard) {
  switch (guard.type) {
    case "module":
      return `withModuleGuard('${guard.module}', `;
    case "anyModule":
      return `withAnyModuleGuard(${JSON.stringify(guard.modules)}, `;
    case "owner":
      return "withOwnerGuard(";
    case "ownerOrDeveloper":
      return "withOwnerOrDeveloperGuard(";
    case "hasModules":
      return "withHasAssignedModulesGuard(";
    case "auth":
    default:
      return "withAuthGuard(";
  }
}

function neededImports(guards) {
  const set = new Set(["withAuthGuard"]);
  for (const g of Object.values(guards)) {
    if (g.type === "module") set.add("withModuleGuard");
    if (g.type === "anyModule") set.add("withAnyModuleGuard");
    if (g.type === "owner") set.add("withOwnerGuard");
    if (g.type === "ownerOrDeveloper") set.add("withOwnerOrDeveloperGuard");
    if (g.type === "hasModules") set.add("withHasAssignedModulesGuard");
  }
  return [...set];
}

function ensureImports(content, imports) {
  const importLine = `import { ${imports.join(", ")} } from '@/lib/with-action-guard';`;
  if (content.includes("with-action-guard")) return content;
  const idx = content.indexOf("\n\n");
  const first = content.indexOf("\n");
  const insertAt = content.startsWith("'use server'") || content.startsWith('"use server"')
    ? content.indexOf("\n", first) + 1
    : 0;
  return content.slice(0, insertAt) + importLine + "\n" + content.slice(insertAt);
}

function wrapExports(content, guardForFn) {
  return content.replace(/^export async function (\w+)/gm, (match, name) => {
    if (match.startsWith("export const")) return match;
    const guard = guardForFn(name);
    if (!guard) return match;
    const wrap = guardImport(guard);
    return `export const ${name} = ${wrap}async function ${name}`;
  }).replace(/export const (\w+) = (with\w+Guard\([^,]+, )async function \1\(/g, (m) => {
    return m; // already wrapped
  });
}

function processFile(filename, guardForFn, extraGuards = {}) {
  const filePath = path.join(actionsDir, filename);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");
  const allGuards = { ...extraGuards };
  for (const [k, v] of Object.entries(FILE_GUARDS)) {
    if (k === filename) {
      for (const fn of content.matchAll(/^export async function (\w+)/gm)) {
        allGuards[fn[1]] = v;
      }
    }
  }
  const mergedGuardForFn = (name) => guardForFn(name) ?? allGuards[name];
  const imports = neededImports(
    Object.fromEntries(
      [...content.matchAll(/^export async function (\w+)/gm)].map((m) => [
        m[1],
        mergedGuardForFn(m[1]) ?? { type: "auth" },
      ])
    )
  );
  content = ensureImports(content, imports);
  content = wrapExports(content, mergedGuardForFn);
  // close wrapping parens: export const foo = withXGuard(async function foo(...) { ... }
  content = content.replace(
    /^export const (\w+) = (with\w+(?:Guard)?(?:\([^)]*\))?, )async function \1\(([^)]*)\) \{/gm,
    "export const $1 = $2async function $1($3) {"
  );
  // Add closing paren before next export or EOF - tricky with regex

  fs.writeFileSync(filePath, content);
  console.log(`Processed ${filename}`);
}

// Simpler approach: only add closing paren by replacing export blocks
function wrapFile(filename, getGuard) {
  const filePath = path.join(actionsDir, filename);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");
  if (content.includes("with-action-guard")) {
    console.log(`Skip ${filename} (already wrapped)`);
    return;
  }

  const fnNames = [...content.matchAll(/^export async function (\w+)/gm)].map((m) => m[1]);
  const guards = fnNames.map((name) => getGuard(name) ?? { type: "auth" });
  const imports = neededImports(Object.fromEntries(fnNames.map((n, i) => [n, guards[i]])));
  content = ensureImports(content, imports);

  for (let i = 0; i < fnNames.length; i++) {
    const name = fnNames[i];
    const guard = guards[i];
    const wrap = guardImport(guard);
    const re = new RegExp(`^export async function ${name}\\(`, "m");
    content = content.replace(re, `export const ${name} = ${wrap}async function ${name}(`);
  }

  // Balance parens: each wrapped export needs one closing ) at end of function
  for (const name of fnNames) {
    const start = content.indexOf(`export const ${name} = `);
    if (start < 0) continue;
    let depth = 0;
    let started = false;
    let end = -1;
    for (let i = start; i < content.length; i++) {
      const ch = content[i];
      if (ch === "{") {
        depth++;
        started = true;
      } else if (ch === "}") {
        depth--;
        if (started && depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end > 0 && content[end] !== ")") {
      content = content.slice(0, end) + ")" + content.slice(end);
    }
  }

  fs.writeFileSync(filePath, content);
  console.log(`Wrapped ${filename} (${fnNames.length} exports)`);
}

for (const [file, guard] of Object.entries(FILE_GUARDS)) {
  wrapFile(file, () => guard);
}

wrapFile("finance.ts", (name) =>
  FINANCE_CASHIER.has(name)
    ? { type: "anyModule", modules: ["cashier", "finance"] }
    : { type: "module", module: "finance" }
);

wrapFile("analytics.ts", (name) => ANALYTICS_GUARDS[name] ?? { type: "auth" });
wrapFile("payments.ts", (name) => PAYMENTS_GUARDS[name] ?? { type: "owner" });
wrapFile("orgs.ts", (name) => ORGS_GUARDS[name] ?? { type: "auth" });
wrapFile("plans.ts", (name) => PLANS_GUARDS[name] ?? { type: "auth" });
wrapFile("users.ts", (name) => USERS_GUARDS[name] ?? { type: "auth" });
wrapFile("join-requests.ts", (name) => JOIN_GUARDS[name] ?? { type: "auth" });
wrapFile("licenses.ts", (name) => LICENSES_GUARDS[name] ?? { type: "auth" });

console.log("Done.");
