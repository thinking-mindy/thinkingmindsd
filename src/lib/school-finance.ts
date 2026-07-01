export type SchoolPaymentCategory = "tuition" | "transport" | "uniform" | "other";

export type SchoolPaymentTx = {
  _id?: string;
  type?: string;
  amount?: number;
  createdAt?: string | Date | number;
  paymentTypeId?: string;
  paymentType?: string;
  isSchoolPayment?: boolean;
  studentName?: string;
  studentNumber?: string;
  className?: string;
  reference?: string;
  schoolTermLabel?: string;
  schoolTermId?: string;
};

export type SchoolFeeAggregates = {
  total: number;
  tuition: number;
  transport: number;
  uniform: number;
  other: number;
  transactionCount: number;
};

export function classifySchoolPayment(tx: SchoolPaymentTx): SchoolPaymentCategory {
  const id = String(tx.paymentTypeId ?? "").toLowerCase();
  const name = String(tx.paymentType ?? "").toLowerCase();
  if (id === "tuition-fees" || name.includes("tuition")) return "tuition";
  if (id === "transport" || name.includes("transport")) return "transport";
  if (id === "uniform-fee" || name.includes("uniform")) return "uniform";
  return "other";
}

export function signedSchoolAmount(tx: SchoolPaymentTx): number {
  const amount = Math.abs(Number(tx.amount ?? 0));
  if (tx.type === "refund" || tx.type === "withdrawal") return -amount;
  return amount;
}

export function isSchoolCollectionTx(tx: SchoolPaymentTx): boolean {
  if (tx.isSchoolPayment) return true;
  const id = String(tx.paymentTypeId ?? "").toLowerCase();
  const name = String(tx.paymentType ?? "").toLowerCase();
  return (
    id === "tuition-fees" ||
    id === "transport" ||
    id === "uniform-fee" ||
    name.includes("tuition") ||
    name.includes("transport") ||
    name.includes("uniform") ||
    name.includes("school fee")
  );
}

export type SchoolPeriod = "month" | "term" | "year" | "all";

export type SchoolTermInfo = {
  id: string;
  termKey: "T1" | "T2" | "T3";
  label: string;
  start: Date;
  end: Date;
};

/** Zimbabwe school calendar: T1 Jan–Apr, T2 May–Aug, T3 Sep–Dec. */
export function getCurrentSchoolTerm(now = new Date()): SchoolTermInfo {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m < 4) {
    return {
      id: `${y}-T1`,
      termKey: "T1",
      label: `Term 1 · Jan–Apr ${y}`,
      start: new Date(y, 0, 1),
      end: new Date(y, 3, 30, 23, 59, 59, 999),
    };
  }
  if (m < 8) {
    return {
      id: `${y}-T2`,
      termKey: "T2",
      label: `Term 2 · May–Aug ${y}`,
      start: new Date(y, 4, 1),
      end: new Date(y, 7, 31, 23, 59, 59, 999),
    };
  }
  return {
    id: `${y}-T3`,
    termKey: "T3",
    label: `Term 3 · Sep–Dec ${y}`,
    start: new Date(y, 8, 1),
    end: new Date(y, 11, 31, 23, 59, 59, 999),
  };
}

function repairSchoolTxDate(d: Date, now = new Date()): Date {
  const y = d.getFullYear();
  if (y >= 2000 && y <= 2100) return d;
  // Legacy / bad clocks (e.g. year 56) — keep month/day in current calendar year
  return new Date(
    now.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds()
  );
}

/** Parse cashier/school payment timestamps (ISO string, epoch ms, or Date). */
export function parseSchoolTxDate(
  createdAt: string | Date | number | undefined,
  now = new Date()
): Date | null {
  if (createdAt == null || createdAt === "") return null;
  if (createdAt instanceof Date) {
    return Number.isNaN(createdAt.getTime()) ? null : repairSchoolTxDate(createdAt, now);
  }
  if (typeof createdAt === "number") {
    // Heuristic: seconds vs milliseconds
    const ms = createdAt < 1_000_000_000_000 ? createdAt * 1000 : createdAt;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : repairSchoolTxDate(d, now);
  }
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? null : repairSchoolTxDate(d, now);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function inDateRange(
  createdAt: string | Date | number | undefined,
  start?: Date | null,
  end?: Date | null,
  now = new Date()
): boolean {
  if (!start && !end) return true;

  const date = parseSchoolTxDate(createdAt, now);
  if (!date) return true;

  if (start && date < startOfDay(start)) return false;
  if (end && date > endOfDay(end)) return false;
  return true;
}

function matchesSchoolTerm(tx: SchoolPaymentTx, term: SchoolTermInfo): boolean {
  const tid = String(tx.schoolTermId ?? "");
  if (tid === term.id || tid.endsWith(`-${term.termKey}`)) return true;

  const label = String(tx.schoolTermLabel ?? "").toLowerCase();
  const termNum = term.termKey.replace("T", "");
  if (label.includes(term.termKey.toLowerCase()) || label.includes(`term ${termNum}`)) {
    return true;
  }
  return false;
}

export function schoolPaymentMatchesPeriod(
  tx: SchoolPaymentTx,
  period: SchoolPeriod,
  start?: Date | null,
  end?: Date | null,
  now = new Date()
): boolean {
  if (period === "all" || (!start && !end)) return true;

  if (period === "term") {
    const term = getCurrentSchoolTerm(end ?? now);
    if (matchesSchoolTerm(tx, term)) return true;
    if (inDateRange(tx.createdAt, term.start, term.end, now)) return true;
    return false;
  }

  return inDateRange(tx.createdAt, start, end, now);
}

export function normalizeSchoolPaymentTx(tx: SchoolPaymentTx): SchoolPaymentTx {
  const raw = tx as SchoolPaymentTx & {
    completedAt?: string | Date | number;
    date?: string | Date | number;
  };
  const createdAt =
    raw.createdAt ?? raw.completedAt ?? raw.date ?? (raw._id ? undefined : new Date().toISOString());
  return { ...tx, createdAt };
}

export function aggregateSchoolPayments(
  txs: SchoolPaymentTx[],
  start?: Date | null,
  end?: Date | null,
  period: SchoolPeriod = start || end ? "month" : "all"
): SchoolFeeAggregates {
  const result: SchoolFeeAggregates = {
    total: 0,
    tuition: 0,
    transport: 0,
    uniform: 0,
    other: 0,
    transactionCount: 0,
  };

  for (const raw of txs) {
    const tx = normalizeSchoolPaymentTx(raw);
    if (!isSchoolCollectionTx(tx)) continue;
    if (!schoolPaymentMatchesPeriod(tx, period, start, end)) continue;

    const signed = signedSchoolAmount(tx);
    result.total += signed;
    result.transactionCount += 1;

    const category = classifySchoolPayment(tx);
    result[category] += signed;
  }

  return result;
}

export function schoolPaymentsByMonth(
  txs: SchoolPaymentTx[],
  months = 6
): { month: string; tuition: number; transport: number; uniform: number; total: number }[] {
  const buckets = new Map<string, { tuition: number; transport: number; uniform: number; total: number }>();

  for (const raw of txs) {
    const tx = normalizeSchoolPaymentTx(raw);
    if (!isSchoolCollectionTx(tx)) continue;
    const date = parseSchoolTxDate(tx.createdAt) ?? new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key) ?? { tuition: 0, transport: 0, uniform: 0, total: 0 };
    const signed = signedSchoolAmount(tx);
    const category = classifySchoolPayment(tx);
    bucket.total += signed;
    if (category === "tuition") bucket.tuition += signed;
    else if (category === "transport") bucket.transport += signed;
    else if (category === "uniform") bucket.uniform += signed;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-months)
    .map(([month, values]) => ({ month, ...values }));
}

export type StudentBalanceRow = {
  _id: string;
  name: string;
  studentNumber?: string;
  className?: string;
  termLabel?: string;
  feesPerTerm: number;
  paidThisTerm: number;
  remaining: number;
  percentPaid: number;
};

export function mapStudentBalances(students: Record<string, unknown>[]): StudentBalanceRow[] {
  return students
    .map((student) => {
      const balance = student.feeBalance as Record<string, unknown> | undefined;
      if (!balance?.hasClassFees) return null;
      const feesPerTerm = Number(balance.feesPerTerm ?? 0);
      if (feesPerTerm <= 0) return null;
      const paidThisTerm = Number(balance.paidThisTerm ?? 0);
      const remaining = Number(balance.remainingBalance ?? 0);
      return {
        _id: String(student._id),
        name: `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
        studentNumber: student.studentNumber as string | undefined,
        className: (balance.className ?? student.className) as string | undefined,
        termLabel: balance.termLabel as string | undefined,
        feesPerTerm,
        paidThisTerm,
        remaining,
        percentPaid: feesPerTerm > 0 ? Math.min(100, (paidThisTerm / feesPerTerm) * 100) : 0,
      };
    })
    .filter(Boolean) as StudentBalanceRow[];
}

export function summarizeOutstanding(rows: StudentBalanceRow[]) {
  const outstanding = rows.filter((r) => r.remaining > 0);
  const totalDue = outstanding.reduce((sum, r) => sum + r.remaining, 0);
  const totalBilled = rows.reduce((sum, r) => sum + r.feesPerTerm, 0);
  const totalPaid = rows.reduce((sum, r) => sum + r.paidThisTerm, 0);
  const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;
  return {
    outstandingCount: outstanding.length,
    totalDue,
    totalBilled,
    totalPaid,
    collectionRate,
    topOutstanding: [...outstanding].sort((a, b) => b.remaining - a.remaining).slice(0, 6),
  };
}
