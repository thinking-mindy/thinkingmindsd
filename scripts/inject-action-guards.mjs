/**
 * Injects await assert*() calls at the start of exported server actions.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const actionsDir = path.join(root, "src", "_actions");

const FILE_DEFAULT = {
  "pos.ts": "assertModuleAccess('pos')",
  "crm.ts": "assertModuleAccess('crm')",
  "school.ts": "assertModuleAccess('school')",
  "helpdesk.ts": "assertModuleAccess('helpdesk')",
  "knowledge-base.ts": "assertModuleAccess('helpdesk')",
  "payroll.ts": "assertAnyModuleAccess(['payroll', 'hr'])",
  "leave-requests.ts": "assertModuleAccess('hr')",
  "projects-tasks.ts": "assertModuleAccess('tasks')",
  "inventory-items.ts": "assertModuleAccess('inventory')",
  "stock-movements.ts": "assertModuleAccess('inventory')",
  "purchase-orders.ts": "assertModuleAccess('procurement')",
  "suppliers.ts": "assertAnyModuleAccess(['inventory', 'procurement'])",
  "inventory-pos-sync.ts": "assertAnyModuleAccess(['inventory', 'pos'])",
  "audit-logs.ts": "assertModuleAccess('audit')",
  "notifications.ts": "assertModuleAccess('notifications')",
  "currencies.ts": "assertModuleAccess('currency')",
  "assets.ts": "assertModuleAccess('it')",
  "receipt-design.ts": "assertAnyModuleAccess(['pos', 'cashier'])",
  "user-requests.ts": "assertModuleAccess('helpdesk')",
  "usage-logs.ts": "assertAnyModuleAccess(['logs', 'admin'])",
  "overrides.ts": "assertOwnerOrDeveloper()",
  "overrides-terminal.ts": "assertOwnerOrDeveloper()",
  "overrides.ts": "assertOwnerOrDeveloper()",
  "school.ts": "assertModuleAccess('school')",
  "receipt-design.ts": "assertAnyModuleAccess(['pos', 'cashier'])",
  "i18n.ts": "requireAuth()",
  "logs.ts": "requireAuth()",
  "licenses.ts": "requireAuth()",
};

const PER_FUNCTION = {
  "finance.ts": {
    createCashierTransaction: "assertAnyModuleAccess(['cashier', 'finance'])",
    getCashierTransactions: "assertAnyModuleAccess(['cashier', 'finance'])",
    getCashierTransactionsFiltered: "assertAnyModuleAccess(['cashier', 'finance'])",
    getDailyCashSummary: "assertAnyModuleAccess(['cashier', 'finance'])",
    "*": "assertModuleAccess('finance')",
  },
  "analytics.ts": {
    getFinanceAnalytics: "assertModuleAccess('finance')",
    getHRAnalytics: "assertModuleAccess('hr')",
    getMarketingAnalytics: "assertModuleAccess('crm')",
    getOverviewAnalytics: "assertHasAssignedModules()",
    getInventoryAndPOSAnalytics: "assertAnyModuleAccess(['inventory', 'pos'])",
    "*": "requireAuth()",
  },
  "payments.ts": {
    getPaymentsForOrg: "assertModuleAccess('admin')",
    getPaymentsForCurrentOrg: "assertModuleAccess('admin')",
    initiatePlanPayment: "assertOwner()",
    initiatePOSPayNowPayment: "assertModuleAccess('pos')",
    checkPlanPaymentStatus: "assertOwner()",
  },
  "orgs.ts": {
    getAllOrgs: "assertOwner()",
    updateOrg: "assertOwner()",
    updateOrgPlan: "assertOwner()",
    ensureOrgsHavePlans: "assertOwner()",
    deleteOrg: "assertOwner()",
    "*": "requireAuth()",
  },
  "plans.ts": {
    seedDefaultPlans: "assertOwner()",
    createPlan: "assertOwner()",
    updatePlan: "assertOwner()",
    deletePlan: "assertOwner()",
    "*": "requireAuth()",
  },
  "users.ts": {
    updateUser: "assertOwner()",
    updateUserRole: "assertOwner()",
    updateUserAllowedModules: "assertOwner()",
    deleteUser: "assertOwner()",
    getMembers: "assertModuleAccess('admin')",
    getMembersDep: "assertModuleAccess('admin')",
    getActive: "assertModuleAccess('admin')",
    getUserAtivity: "assertModuleAccess('admin')",
    "*": "requireAuth()",
  },
  "join-requests.ts": {
    getJoinRequestsByOrg: "assertOwner()",
    getJoinRequestsForCurrentOrg: "assertOwner()",
    approveJoinRequest: "assertOwner()",
    rejectJoinRequest: "assertOwner()",
    "*": "requireAuth()",
  },
  "licenses.ts": {
    extendLicense: "assertOwner()",
    refreshLicenseFromRemoteMongo: "assertOwner()",
    getLicenseStatus: "requireAuth()",
    getLicenseStatusForCurrentUser: "requireAuth()",
  },
};

const IMPORT_LINE =
  "import { assertAnyModuleAccess, assertHasAssignedModules, assertModuleAccess, assertOwner, assertOwnerOrDeveloper, requireAuth } from '@/lib/module-access-server';";

function guardFor(file, fnName) {
  const perFile = PER_FUNCTION[file];
  if (perFile?.[fnName]) return perFile[fnName];
  if (perFile?.["*"]) return perFile["*"];
  return FILE_DEFAULT[file] ?? "requireAuth()";
}

function neededImports(content, guards) {
  const names = new Set();
  for (const g of guards) {
    if (g.startsWith("assertModuleAccess")) names.add("assertModuleAccess");
    if (g.startsWith("assertAnyModuleAccess")) names.add("assertAnyModuleAccess");
    if (g.startsWith("assertOwnerOrDeveloper")) names.add("assertOwnerOrDeveloper");
    if (g.startsWith("assertOwner")) names.add("assertOwner");
    if (g.startsWith("assertHasAssignedModules")) names.add("assertHasAssignedModules");
    if (g.startsWith("requireAuth")) names.add("requireAuth");
  }
  return `import { ${[...names].sort().join(", ")} } from '@/lib/module-access-server';`;
}

function injectFile(filename) {
  const filePath = path.join(actionsDir, filename);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("'use server") && !content.includes('"use server')) return;

  const fnRegex = /^export async function (\w+)\s*\(/gm;
  const fnNames = [...content.matchAll(fnRegex)].map((m) => m[1]);
  if (!fnNames.length) return;

  const guards = fnNames.map((n) => guardFor(filename, n));
  const importLine = neededImports(content, guards);

  if (!content.includes("module-access-server")) {
    const nl = content.indexOf("\n");
    content = content.slice(0, nl + 1) + importLine + "\n" + content.slice(nl + 1);
  }

  for (let i = 0; i < fnNames.length; i++) {
    const name = fnNames[i];
    const guard = guards[i];
    const inject = `await ${guard};`;
    const marker = `export async function ${name}`;
    const start = content.indexOf(marker);
    if (start < 0) continue;

    // Find function body opening brace
    let brace = content.indexOf("{", start);
    if (brace < 0) continue;

  const afterBrace = content.slice(brace + 1, brace + 80);
    if (afterBrace.includes(inject)) continue;

    const tryIdx = content.indexOf("try {", brace);
    const nextExport = content.indexOf("\nexport ", brace + 1);
    const useTry = tryIdx >= 0 && (nextExport < 0 || tryIdx < nextExport);

    if (useTry) {
      content =
        content.slice(0, tryIdx + 5) +
        `\n    ${inject}` +
        content.slice(tryIdx + 5);
    } else {
      content =
        content.slice(0, brace + 1) +
        `\n  ${inject}` +
        content.slice(brace + 1);
    }
  }

  fs.writeFileSync(filePath, content);
  console.log(`Injected ${fnNames.length} guards into ${filename}`);
}

const files = new Set([
  ...Object.keys(FILE_DEFAULT),
  ...Object.keys(PER_FUNCTION),
]);

for (const file of files) injectFile(file);

console.log("Done.");
