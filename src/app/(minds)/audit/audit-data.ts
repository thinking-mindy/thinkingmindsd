import { getAuditLogsByOrg } from '@/lib/desktop/audit-bridge';
import { getFinancialSummary, getExpensesByOrg, getInvoicesByOrg } from '@/lib/desktop/finance-bridge';
import { getStockMovements } from '@/lib/desktop/inventory-bridge';
import { getLicenseStatusBridge } from '@/lib/desktop/licensing-bridge';
import { getPayrollRecordsByOrg } from '@/lib/desktop/payroll-bridge';
import { getMembers } from '@/lib/desktop/users-bridge';
import { memberDisplayName } from '@/lib/member-display';
import type { LicenseStatus } from '@/lib/license-utils';

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AuditSource = 'audit_log' | 'stock_movement' | 'payroll' | 'expense';

export type AuditEvent = {
  id: string;
  source: AuditSource;
  timestamp: Date;
  action: string;
  actor: string;
  resource: string;
  category: string;
  severity: AuditSeverity;
  summary: string;
  details?: string;
};

export type ComplianceStatus = 'pass' | 'warn' | 'fail' | 'pending';

export type ComplianceCheck = {
  id: string;
  title: string;
  domain: 'Finance' | 'HR' | 'Security' | 'Licensing' | 'Inventory' | 'Operations';
  status: ComplianceStatus;
  score: number;
  detail: string;
  recommendation?: string;
};

export type PayrollFiling = {
  id: string;
  period: string;
  recordCount: number;
  totalNet: number;
  totalTax: number;
  lastUpdated: Date | null;
};

export type AuditDashboardData = {
  events: AuditEvent[];
  compliance: ComplianceCheck[];
  payrollFilings: PayrollFiling[];
  activityByDay: { date: string; label: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  stats: {
    totalEvents: number;
    eventsLast7Days: number;
    criticalCount: number;
    complianceScore: number;
    openIssues: number;
    auditLogCount: number;
    memberCount: number;
  };
};

type MemberRow = Record<string, unknown>;

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function actorIdString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return String((value as { toString: () => string }).toString());
  }
  return String(value);
}

function resolveActor(actorId: unknown, members: MemberRow[]): string {
  const id = actorIdString(actorId);
  if (!id) return 'System';
  const member = members.find((m) => {
    const mid = actorIdString(m._id ?? m.id);
    return mid === id;
  });
  return member ? memberDisplayName(member) : 'Unknown user';
}

function severityFromAction(action: string): AuditSeverity {
  const a = action.toLowerCase();
  if (a.includes('delete') || a.includes('remove') || a.includes('revoke')) return 'critical';
  if (a.includes('security') || a.includes('permission') || a.includes('role')) return 'high';
  if (a.includes('update') || a.includes('change') || a.includes('modify') || a.includes('adjust')) {
    return 'medium';
  }
  if (a.includes('create') || a.includes('add') || a.includes('import')) return 'low';
  return 'info';
}

function categoryFromResource(resource: string): string {
  const r = resource.toLowerCase();
  if (r.includes('payroll') || r.includes('salary')) return 'HR & Payroll';
  if (r.includes('user') || r.includes('member') || r.includes('employee')) return 'Access control';
  if (r.includes('invoice') || r.includes('payment') || r.includes('expense') || r.includes('budget')) {
    return 'Finance';
  }
  if (r.includes('inventory') || r.includes('stock') || r.includes('product')) return 'Inventory';
  if (r.includes('license') || r.includes('security')) return 'Security';
  return 'Operations';
}

function statusScore(status: ComplianceStatus): number {
  switch (status) {
    case 'pass':
      return 100;
    case 'warn':
      return 55;
    case 'pending':
      return 35;
    case 'fail':
      return 0;
  }
}

function buildActivityByDay(events: AuditEvent[], days = 14) {
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);

  for (const event of events) {
    if (event.timestamp < cutoff) continue;
    const key = event.timestamp.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({
    date,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count,
  }));
}

function summarizeChange(before: unknown, after: unknown, resource: string, action: string): string {
  if (before != null || after != null) {
    const b = before != null ? JSON.stringify(before) : '—';
    const a = after != null ? JSON.stringify(after) : '—';
    if (b.length > 80 || a.length > 80) {
      return `${action} on ${resource} (field changes recorded)`;
    }
    return `${resource}: ${b} → ${a}`;
  }
  return `${action} on ${resource}`;
}

export async function loadAuditDashboard(orgId: string): Promise<AuditDashboardData> {
  const [
    auditRes,
    membersRes,
    payrollRes,
    stockRes,
    summaryRes,
    expensesRes,
    invoicesRes,
    licenseStatus,
  ] = await Promise.all([
    orgId ? getAuditLogsByOrg(orgId, 150) : Promise.resolve({ success: false, data: [] }),
    getMembers(),
    orgId ? getPayrollRecordsByOrg(orgId) : Promise.resolve({ success: false, data: [] }),
    getStockMovements({ limit: 80 }),
    getFinancialSummary(orgId || undefined).catch(() => ({ success: false, data: null })),
    orgId
      ? getExpensesByOrg(orgId).catch(() => ({ success: false, data: [] }))
      : Promise.resolve({ success: false, data: [] }),
    orgId
      ? getInvoicesByOrg(orgId).catch(() => ({ success: false, data: [] }))
      : Promise.resolve({ success: false, data: [] }),
    orgId ? getLicenseStatusBridge(orgId) : Promise.resolve(null),
  ]);

  const members: MemberRow[] =
    membersRes.aye && Array.isArray(membersRes.aye) ? (membersRes.aye as MemberRow[]) : [];
  const auditLogs = auditRes.success && auditRes.data ? auditRes.data : [];
  const payrollRecords = payrollRes.success && payrollRes.data ? payrollRes.data : [];
  const stockMovements = stockRes.success && stockRes.data ? stockRes.data : [];
  const expenses = expensesRes.success && expensesRes.data ? expensesRes.data : [];
  const invoices = invoicesRes.success && invoicesRes.data ? invoicesRes.data : [];
  const summary = summaryRes.success && summaryRes.data ? summaryRes.data : null;

  const events: AuditEvent[] = [];

  for (const log of auditLogs) {
    const row = log as Record<string, unknown>;
    const ts = parseDate(row.timestamp) ?? new Date();
    const action = String(row.action ?? 'Activity');
    const resource = String(row.resource ?? 'resource');
    events.push({
      id: `log-${actorIdString(row._id ?? row.id)}`,
      source: 'audit_log',
      timestamp: ts,
      action,
      actor: resolveActor(row.actorId, members),
      resource,
      category: categoryFromResource(resource),
      severity: severityFromAction(action),
      summary: summarizeChange(row.before, row.after, resource, action),
      details:
        row.ipAddress || row.userAgent
          ? [row.ipAddress, row.userAgent].filter(Boolean).join(' · ')
          : undefined,
    });
  }

  for (const movement of stockMovements) {
    const row = movement as Record<string, unknown>;
    const ts = parseDate(row.createdAt ?? row.date) ?? new Date();
    const type = String(row.type ?? 'MOVE').toUpperCase();
    const qty = row.quantity ?? row.qty ?? 0;
    const item = String(row.itemName ?? row.itemId ?? 'item');
    events.push({
      id: `stock-${actorIdString(row._id ?? row.id)}`,
      source: 'stock_movement',
      timestamp: ts,
      action: `Stock ${type}`,
      actor: resolveActor(row.userId ?? row.createdBy, members),
      resource: item,
      category: 'Inventory',
      severity: type === 'ADJUST' ? 'medium' : 'low',
      summary: `${type} ${qty} units — ${item}`,
      details: row.reason ? String(row.reason) : undefined,
    });
  }

  for (const record of payrollRecords.slice(0, 40)) {
    const row = record as Record<string, unknown>;
    const ts = parseDate(row.createdAt ?? row.updatedAt) ?? new Date();
    const period = String(row.payPeriod ?? 'Pay period');
    const net = Number(row.net ?? row.gross ?? 0);
    events.push({
      id: `payroll-${actorIdString(row._id ?? row.id)}`,
      source: 'payroll',
      timestamp: ts,
      action: 'Payroll processed',
      actor: resolveActor(row.employeeId ?? row.processedBy, members),
      resource: period,
      category: 'HR & Payroll',
      severity: 'info',
      summary: `Net pay ${net.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} for ${period}`,
    });
  }

  const pendingExpenses = expenses.filter(
    (e: Record<string, unknown>) => String(e.status ?? '').toLowerCase() === 'pending'
  );
  for (const expense of pendingExpenses.slice(0, 15)) {
    const row = expense as Record<string, unknown>;
    const ts = parseDate(row.createdAt ?? row.date) ?? new Date();
    events.push({
      id: `expense-${actorIdString(row._id ?? row.id)}`,
      source: 'expense',
      timestamp: ts,
      action: 'Expense awaiting approval',
      actor: resolveActor(row.submittedBy ?? row.userId, members),
      resource: String(row.category ?? row.description ?? 'Expense'),
      category: 'Finance',
      severity: 'medium',
      summary: `${Number(row.amount ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} pending review`,
    });
  }

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const eventsLast7Days = events.filter((e) => e.timestamp >= sevenDaysAgo).length;
  const criticalCount = events.filter((e) => e.severity === 'critical' || e.severity === 'high').length;

  const categoryMap = new Map<string, number>();
  for (const e of events) {
    categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + 1);
  }
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const periodMap = new Map<string, PayrollFiling>();
  for (const record of payrollRecords) {
    const row = record as Record<string, unknown>;
    const period = String(row.payPeriod ?? 'Unknown');
    const existing = periodMap.get(period) ?? {
      id: period,
      period,
      recordCount: 0,
      totalNet: 0,
      totalTax: 0,
      lastUpdated: null,
    };
    const deductions = row.deductions as Record<string, unknown> | undefined;
    existing.recordCount += 1;
    existing.totalNet += Number(row.net ?? row.gross ?? 0);
    existing.totalTax += Number(deductions?.tax ?? 0);
    const ts = parseDate(row.updatedAt ?? row.createdAt);
    if (ts && (!existing.lastUpdated || ts > existing.lastUpdated)) {
      existing.lastUpdated = ts;
    }
    periodMap.set(period, existing);
  }
  const payrollFilings = Array.from(periodMap.values()).sort((a, b) => {
    const ta = a.lastUpdated?.getTime() ?? 0;
    const tb = b.lastUpdated?.getTime() ?? 0;
    return tb - ta;
  });

  const compliance = buildComplianceChecks({
    orgId,
    licenseStatus,
    auditLogCount: auditLogs.length,
    recentAuditLogs: auditLogs.filter((l: Record<string, unknown>) => {
      const ts = parseDate(l.timestamp);
      return ts != null && ts >= thirtyDaysAgo;
    }).length,
    memberCount: members.length,
    payrollCount: payrollRecords.length,
    stockMovementCount: stockMovements.filter((m: Record<string, unknown>) => {
      const ts = parseDate(m.createdAt ?? m.date);
      return ts != null && ts >= thirtyDaysAgo;
    }).length,
    pendingExpenses: pendingExpenses.length,
    overdueInvoices: Number(summary?.overdueInvoices ?? 0),
    eventsLast7Days,
  });

  const complianceScore = Math.round(
    compliance.reduce((sum, c) => sum + c.score, 0) / Math.max(compliance.length, 1)
  );
  const openIssues = compliance.filter((c) => c.status === 'warn' || c.status === 'fail').length;

  return {
    events,
    compliance,
    payrollFilings,
    activityByDay: buildActivityByDay(events),
    categoryBreakdown,
    stats: {
      totalEvents: events.length,
      eventsLast7Days,
      criticalCount,
      complianceScore,
      openIssues,
      auditLogCount: auditLogs.length,
      memberCount: members.length,
    },
  };
}

function buildComplianceChecks(input: {
  orgId: string;
  licenseStatus: LicenseStatus | null;
  auditLogCount: number;
  recentAuditLogs: number;
  memberCount: number;
  payrollCount: number;
  stockMovementCount: number;
  pendingExpenses: number;
  overdueInvoices: number;
  eventsLast7Days: number;
}): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  if (input.licenseStatus) {
    const ls = input.licenseStatus;
    let status: ComplianceStatus = 'pass';
    let detail = `Plan active — ${ls.daysRemaining} days remaining on ${ls.planSlug}.`;
    let recommendation: string | undefined;
    if (ls.isExpired) {
      status = 'fail';
      detail = 'License has expired. Renew to restore full module access.';
      recommendation = 'Open Admin → Licensing to renew your subscription.';
    } else if (ls.daysRemaining <= 10) {
      status = 'warn';
      detail = `License expires in ${ls.daysRemaining} days.`;
      recommendation = 'Schedule renewal before expiry to avoid service interruption.';
    }
    checks.push({
      id: 'license',
      title: 'Software license',
      domain: 'Licensing',
      status,
      score: statusScore(status),
      detail,
      recommendation,
    });
  } else {
    checks.push({
      id: 'license',
      title: 'Software license',
      domain: 'Licensing',
      status: 'pending',
      score: statusScore('pending'),
      detail: 'License status could not be verified for this organization.',
      recommendation: 'Confirm your organization is linked in Admin settings.',
    });
  }

  const payrollStatus: ComplianceStatus =
    input.payrollCount > 0 ? 'pass' : input.orgId ? 'warn' : 'pending';
  checks.push({
    id: 'payroll',
    title: 'Payroll filings',
    domain: 'HR',
    status: payrollStatus,
    score: statusScore(payrollStatus),
    detail:
      input.payrollCount > 0
        ? `${input.payrollCount} payroll record(s) on file.`
        : 'No payroll records found for this organization.',
    recommendation:
      input.payrollCount === 0 ? 'Process payroll in Finance → Payroll to establish a filing trail.' : undefined,
  });

  const trailStatus: ComplianceStatus =
    input.recentAuditLogs >= 5 || input.eventsLast7Days >= 8
      ? 'pass'
      : input.auditLogCount > 0 || input.stockMovementCount > 0
        ? 'warn'
        : 'pending';
  checks.push({
    id: 'trail',
    title: 'Activity trail coverage',
    domain: 'Operations',
    status: trailStatus,
    score: statusScore(trailStatus),
    detail: `${input.auditLogCount} audit log(s), ${input.stockMovementCount} inventory movement(s) in the last 30 days.`,
    recommendation:
      trailStatus !== 'pass'
        ? 'Enable audit logging on sensitive actions and keep inventory movements documented.'
        : undefined,
  });

  const accessStatus: ComplianceStatus = input.memberCount > 0 ? 'pass' : 'fail';
  checks.push({
    id: 'access',
    title: 'User roster review',
    domain: 'Security',
    status: accessStatus,
    score: statusScore(accessStatus),
    detail:
      input.memberCount > 0
        ? `${input.memberCount} active member(s) registered.`
        : 'No members found — access controls cannot be validated.',
    recommendation:
      input.memberCount === 0 ? 'Invite team members via Admin → Users.' : undefined,
  });

  const expenseStatus: ComplianceStatus =
    input.pendingExpenses === 0 ? 'pass' : input.pendingExpenses <= 3 ? 'warn' : 'fail';
  checks.push({
    id: 'expenses',
    title: 'Expense approvals',
    domain: 'Finance',
    status: expenseStatus,
    score: statusScore(expenseStatus),
    detail:
      input.pendingExpenses === 0
        ? 'No expenses awaiting approval.'
        : `${input.pendingExpenses} expense(s) pending approval.`,
    recommendation:
      input.pendingExpenses > 0 ? 'Review pending items in Finance → Expenses.' : undefined,
  });

  const arStatus: ComplianceStatus =
    input.overdueInvoices === 0 ? 'pass' : input.overdueInvoices <= 2 ? 'warn' : 'fail';
  checks.push({
    id: 'receivables',
    title: 'Overdue receivables',
    domain: 'Finance',
    status: arStatus,
    score: statusScore(arStatus),
    detail:
      input.overdueInvoices === 0
        ? 'No overdue invoices reported this period.'
        : `${input.overdueInvoices} overdue invoice(s) on the books.`,
    recommendation:
      input.overdueInvoices > 0 ? 'Follow up in Finance → Receivables.' : undefined,
  });

  const inventoryStatus: ComplianceStatus = input.stockMovementCount > 0 ? 'pass' : 'warn';
  checks.push({
    id: 'inventory',
    title: 'Inventory movement log',
    domain: 'Inventory',
    status: inventoryStatus,
    score: statusScore(inventoryStatus),
    detail:
      input.stockMovementCount > 0
        ? `${input.stockMovementCount} stock movement(s) recorded in the last 30 days.`
        : 'No recent stock movements — inventory changes may be untracked.',
    recommendation:
      input.stockMovementCount === 0
        ? 'Record stock in/out in Inventory → Movements.'
        : undefined,
  });

  return checks;
}

export function exportEventsCsv(events: AuditEvent[]): string {
  const header = ['Timestamp', 'Source', 'Action', 'Actor', 'Category', 'Severity', 'Summary'];
  const rows = events.map((e) =>
    [
      e.timestamp.toISOString(),
      e.source,
      e.action,
      e.actor,
      e.category,
      e.severity,
      e.summary.replace(/"/g, '""'),
    ]
      .map((v) => `"${v}"`)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}
