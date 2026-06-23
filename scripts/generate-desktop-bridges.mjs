#!/usr/bin/env node
/**
 * Generate src/lib/desktop/*-bridge.ts from src/_actions/*.ts + Rust command names.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const actionsDir = path.join(root, 'src/_actions');
const commandsDir = path.join(root, 'src-tauri/src/commands');
const outDir = path.join(root, 'src/lib/desktop');

const ACTION_TO_PREFIX = {
  'finance.ts': 'finance',
  'school.ts': 'school',
  'users.ts': 'users',
  'join-requests.ts': 'join_requests',
  'payments.ts': 'payments',
  'crm.ts': 'crm',
  'payroll.ts': 'payroll',
  'leave-requests.ts': 'payroll',
  'purchase-orders.ts': 'purchase_orders',
  'suppliers.ts': 'inventory',
  'analytics.ts': 'analytics',
  'projects-tasks.ts': 'projects',
  'receipt-design.ts': 'receipt',
  'overrides.ts': 'overrides',
  'overrides-terminal.ts': 'overrides',
  'currencies.ts': 'currencies',
  'user-profile.ts': 'user_profile',
  'inventory-items.ts': 'inventory',
  'pos.ts': 'pos',
  'stock-movements.ts': 'inventory',
  'inventory-pos-sync.ts': 'pos',
  'orgs.ts': 'orgs',
  'plans.ts': 'plans',
  'licenses.ts': 'licensing',
  'local-admin.ts': 'admin',
};

const SKIP_ACTIONS = new Set([
  'org-context.ts',
  'company-context.ts',
  'index.ts',
  'logs.ts',
  'helpdesk.ts',
  'knowledge-base.ts',
  'assets.ts',
  'notifications.ts',
  'audit-logs.ts',
  'usage-logs.ts',
  'i18n.ts',
  'user-requests.ts',
]);

function camelToSnake(name) {
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

function leaveFnToCmd(fn) {
  const map = {
    createLeaveRequest: 'payroll_create_leave_request_cmd',
    getLeaveRequest: 'payroll_get_leave_request_cmd',
    getLeaveRequestsByOrg: 'payroll_get_leave_requests_by_org_cmd',
    getLeaveRequestsForCurrentOrg: 'payroll_get_leave_requests_for_current_org_cmd',
    getLeaveRequestsByEmployee: 'payroll_get_leave_requests_by_employee_cmd',
    getLeaveRequestsByStatus: 'payroll_get_leave_requests_by_status_cmd',
    updateLeaveRequest: 'payroll_update_leave_request_cmd',
    deleteLeaveRequest: 'payroll_delete_leave_request_cmd',
  };
  return map[fn];
}

function payrollFnToCmd(fn) {
  const map = {
    getOrgMembersForHR: 'payroll_get_org_members_for_hr_cmd',
    createPayrollRecord: 'payroll_create_record_cmd',
    getPayrollRecord: 'payroll_get_record_cmd',
    getPayrollRecordsByOrg: 'payroll_get_records_by_org_cmd',
    getPayrollRecordsForCurrentOrg: 'payroll_get_records_for_current_org_cmd',
    getPayrollRecordsByEmployee: 'payroll_get_records_by_employee_cmd',
    getPayrollRecordsByPeriod: 'payroll_get_records_by_period_cmd',
    updatePayrollRecord: 'payroll_update_record_cmd',
    deletePayrollRecord: 'payroll_delete_record_cmd',
  };
  return map[fn];
}

function projectsFnToCmd(fn) {
  const map = {
    getOrgMembersForTasks: 'projects_get_org_members_for_tasks_cmd',
    createProject: 'projects_create_project_cmd',
    getProject: 'projects_get_project_cmd',
    getProjectsByOrg: 'projects_get_projects_by_org_cmd',
    getProjectsForCurrentOrg: 'projects_get_projects_for_current_org_cmd',
    getProjectsByStatus: 'projects_get_projects_by_status_cmd',
    updateProject: 'projects_update_project_cmd',
    addMemberToProject: 'projects_add_member_to_project_cmd',
    deleteProject: 'projects_delete_project_cmd',
    createTask: 'projects_create_task_cmd',
    getTask: 'projects_get_task_cmd',
    getTasksByProject: 'projects_get_tasks_by_project_cmd',
    getTasksByOrg: 'projects_get_tasks_by_org_cmd',
    getTasksForCurrentOrg: 'projects_get_tasks_for_current_org_cmd',
    getTasksByAssigned: 'projects_get_tasks_by_assigned_cmd',
    getTasksByStatus: 'projects_get_tasks_by_status_cmd',
    updateTask: 'projects_update_task_cmd',
    deleteTask: 'projects_delete_task_cmd',
  };
  return map[fn];
}

function receiptFnToCmd(fn) {
  return {
    getReceiptDesignForCurrentOrg: 'receipt_get_design_for_current_org_cmd',
    updateReceiptDesignForCurrentOrg: 'receipt_update_design_for_current_org_cmd',
  }[fn];
}

function overridesFnToCmd(fn) {
  const map = {
    ensureOverridesProject: 'overrides_ensure_project_cmd',
    listOverrideFiles: 'overrides_list_files_cmd',
    getOverrideFile: 'overrides_get_file_cmd',
    upsertOverrideFile: 'overrides_upsert_file_cmd',
    deleteOverrideFile: 'overrides_delete_file_cmd',
    resolveOverrideOrDefault: 'overrides_resolve_or_default_cmd',
    runCompanyShellCommand: 'overrides_run_shell_command_cmd',
  };
  return map[fn];
}

function schoolFnToCmd(fn) {
  const map = {
    buildSchoolFeeSnapshot: 'school_build_fee_snapshot_cmd',
    getStudentTermFeeBalance: 'school_get_student_term_fee_balance_cmd',
    getSchoolReceiptFeeInfo: 'school_get_receipt_fee_info_cmd',
    getSchoolStudentsWithBalances: 'school_get_students_with_balances_cmd',
    createSchoolClassesFromTemplates: 'school_create_classes_from_templates_cmd',
    getSchoolDashboardStats: 'school_get_dashboard_stats_cmd',
    getSchoolSettings: 'school_get_settings_cmd',
    updateSchoolSettings: 'school_update_settings_cmd',
    getSchoolClasses: 'school_get_classes_cmd',
    createSchoolClass: 'school_create_class_cmd',
    updateSchoolClass: 'school_update_class_cmd',
    deleteSchoolClass: 'school_delete_class_cmd',
    getSchoolStudents: 'school_get_students_cmd',
    getSchoolStudent: 'school_get_student_cmd',
    createSchoolStudent: 'school_create_student_cmd',
    updateSchoolStudent: 'school_update_student_cmd',
    deleteSchoolStudent: 'school_delete_student_cmd',
  };
  return map[fn];
}

function licensingFnToCmd(fn) {
  const map = {
    getLicenseStatus: 'license_get_status_cmd',
    getLicenseStatusForCurrentUser: 'license_get_status_for_current_user_cmd',
    extendLicense: 'license_extend_cmd',
    syncLicenseFromServer: 'license_sync_from_server_cmd',
    refreshLicenseFromRemoteMongo: 'license_refresh_from_remote_cmd',
  };
  return map[fn];
}

function orgsFnToCmd(fn) {
  const map = {
    getOrg: 'org_get_cmd',
    searchOrgs: 'org_search_cmd',
    syncLocalOrgToDatabase: 'org_sync_local_cmd',
    updateOrg: 'admin_update_org_cmd',
    updateOrgPlan: 'admin_update_org_plan_cmd',
  };
  return map[fn];
}

function plansFnToCmd(fn) {
  const map = {
    getPlan: 'plan_get_cmd',
    getPlanBySlug: 'plan_get_by_slug_cmd',
    getAllPlans: 'plan_get_all_cmd',
  };
  return map[fn];
}

function fnToCmd(actionFile, fn) {
  if (actionFile === 'leave-requests.ts') return leaveFnToCmd(fn);
  if (actionFile === 'payroll.ts') return payrollFnToCmd(fn);
  if (actionFile === 'projects-tasks.ts') return projectsFnToCmd(fn);
  if (actionFile === 'receipt-design.ts') return receiptFnToCmd(fn);
  if (actionFile === 'overrides.ts' || actionFile === 'overrides-terminal.ts') return overridesFnToCmd(fn);
  if (actionFile === 'school.ts') return schoolFnToCmd(fn);
  if (actionFile === 'licenses.ts') return licensingFnToCmd(fn);
  if (actionFile === 'orgs.ts') return orgsFnToCmd(fn);
  if (actionFile === 'plans.ts') return plansFnToCmd(fn);

  const prefix = ACTION_TO_PREFIX[actionFile];
  if (!prefix) return null;
  return `${prefix}_${camelToSnake(fn)}_cmd`;
}

// Collect all rust commands
const rustCommands = new Set();
for (const file of fs.readdirSync(commandsDir)) {
  if (!file.endsWith('.rs') || file === 'mod.rs') continue;
  const text = fs.readFileSync(path.join(commandsDir, file), 'utf8');
  for (const m of text.matchAll(/pub fn ([a-z0-9_]+_cmd)\s*\(/g)) {
    rustCommands.add(m[1]);
  }
}

const bridgeGroups = new Map();

for (const file of fs.readdirSync(actionsDir)) {
  if (!file.endsWith('.ts') || SKIP_ACTIONS.has(file)) continue;
  const prefix = ACTION_TO_PREFIX[file];
  if (!prefix && file !== 'licenses.ts') continue;

  const text = fs.readFileSync(path.join(actionsDir, file), 'utf8');
  const actionImport = `@/_actions/${file.replace(/\.ts$/, '')}`;
  const bridgeName = `${file.replace(/\.ts$/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())}-bridge`;
  // e.g. finance-bridge, join-requests-bridge awkward - use mapping
  const bridgeBase = {
    'finance.ts': 'finance-bridge',
    'school.ts': 'school-bridge',
    'users.ts': 'users-bridge',
    'join-requests.ts': 'join-requests-bridge',
    'payments.ts': 'payments-bridge',
    'crm.ts': 'crm-bridge',
    'payroll.ts': 'payroll-bridge',
    'leave-requests.ts': 'payroll-bridge',
    'purchase-orders.ts': 'purchase-orders-bridge',
    'suppliers.ts': 'inventory-bridge',
    'analytics.ts': 'analytics-bridge',
    'projects-tasks.ts': 'projects-bridge',
    'receipt-design.ts': 'receipt-bridge',
    'overrides.ts': 'overrides-bridge',
    'overrides-terminal.ts': 'overrides-bridge',
    'currencies.ts': 'currencies-bridge',
    'user-profile.ts': 'user-profile-bridge',
    'inventory-items.ts': 'inventory-bridge',
    'pos.ts': 'pos-bridge',
    'stock-movements.ts': 'inventory-bridge',
    'inventory-pos-sync.ts': 'pos-bridge',
    'orgs.ts': 'orgs-bridge',
    'plans.ts': 'plans-bridge',
    'licenses.ts': 'licensing-bridge',
    'local-admin.ts': 'admin-bridge',
  }[file];

  if (!bridgeBase) continue;

  const fns = [...text.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
  if (!fns.length) continue;

  if (!bridgeGroups.has(bridgeBase)) {
    bridgeGroups.set(bridgeBase, { actionImports: new Set(), fns: [] });
  }
  const group = bridgeGroups.get(bridgeBase);
  group.actionImports.add(actionImport);

  for (const fn of fns) {
    const cmd = fnToCmd(file, fn);
    if (!cmd || !rustCommands.has(cmd)) {
      console.warn(`skip ${file}::${fn} -> ${cmd}`);
      continue;
    }
    if (!group.fns.find((x) => x.fn === fn)) {
      group.fns.push({ fn, cmd, actionImport });
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });

for (const [bridgeFile, group] of bridgeGroups) {
  if (bridgeFile === 'admin-bridge.ts' || bridgeFile === 'auth-bridge.ts') continue;
  if (bridgeFile === 'orgs-bridge.ts' || bridgeFile === 'plans-bridge.ts' || bridgeFile === 'licensing-bridge.ts') {
    // merge extra functions into existing hand-written bridges
    const existingPath = path.join(outDir, bridgeFile);
    if (!fs.existsSync(existingPath)) continue;
    let existing = fs.readFileSync(existingPath, 'utf8');
    for (const { fn, cmd, actionImport } of group.fns) {
      if (existing.includes(`export async function ${fn}`)) continue;
      const block = `
export async function ${fn}(...args: unknown[]) {
  if (isTauriBackendAvailable()) {
    return invoke('${cmd}', { args: args[0], ...(args.length > 1 ? { arg1: args[1], arg2: args[2] } : {}) });
  }
  const mod = await import('${actionImport}');
  return (mod.${fn} as (...a: unknown[]) => unknown)(...args);
}
`;
      existing += block;
    }
    fs.writeFileSync(existingPath, existing);
    console.log(`merged ${group.fns.length} into ${bridgeFile}`);
    continue;
  }

  if (bridgeFile === 'inventory-bridge.ts' || bridgeFile === 'pos-bridge.ts') {
    console.log(`skip regenerate ${bridgeFile} (hand-written)`);
    continue;
  }

  const lines = [
    `/** Auto-generated desktop bridge — do not edit by hand if regenerating. */`,
    `import { invoke } from '@tauri-apps/api/core';`,
    `import { isTauriBackendAvailable } from '@/lib/desktop/runtime';`,
    '',
  ];

  // re-export types from action modules
  const typeExports = new Set();
  for (const imp of group.actionImports) {
    const modPath = imp.replace('@/_actions/', '');
    const actionText = fs.readFileSync(path.join(actionsDir, `${modPath}.ts`), 'utf8');
    for (const m of actionText.matchAll(/export type \{([^}]+)\}/g)) {
      typeExports.add(`export type {${m[1]}} from '${imp}';`);
    }
    for (const m of actionText.matchAll(/export interface (\w+)/g)) {
      typeExports.add(`export type { ${m[1]} } from '${imp}';`);
    }
  }
  lines.push(...typeExports, '');

  for (const { fn, cmd, actionImport } of group.fns) {
    lines.push(`export async function ${fn}(...args: unknown[]) {`);
    lines.push(`  if (isTauriBackendAvailable()) {`);
    if (args.length === 0) {
      lines.push(`    return invoke('${cmd}');`);
    } else {
      lines.push(`    const payload: Record<string, unknown> = {};`);
      lines.push(`    if (args[0] !== undefined) payload.data = args[0];`);
      lines.push(`    if (args[1] !== undefined) payload.arg1 = args[1];`);
      lines.push(`    if (args[2] !== undefined) payload.arg2 = args[2];`);
      lines.push(`    if (args[3] !== undefined) payload.arg3 = args[3];`);
      lines.push(`    return invoke('${cmd}', payload);`);
    }
    lines.push(`  }`);
    lines.push(`  const mod = await import('${actionImport}');`);
    lines.push(`  return (mod.${fn} as (...a: unknown[]) => unknown)(...args);`);
    lines.push(`}`);
    lines.push('');
  }

  fs.writeFileSync(path.join(outDir, bridgeFile), lines.join('\n'));
  console.log(`wrote ${bridgeFile} (${group.fns.length} fns)`);
}
