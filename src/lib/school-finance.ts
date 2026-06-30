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

/** Parse cashier/school payment timestamps (ISO string, epoch ms, or Date). */
export function parseSchoolTxDate(createdAt: string | Date | number | undefined): Date | null {
  if (createdAt == null || createdAt === "") return null;
  if (createdAt instanceof Date) {
    return Number.isNaN(createdAt.getTime()) ? null : createdAt;
  }
  if (typeof createdAt === "number") {
    const d = new Date(createdAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
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
  end?: Date | null
): boolean {
  if (!start && !end) return true;

  const date = parseSchoolTxDate(createdAt);
  // Match cashier: unknown dates still count in the active period
  if (!date) return true;

  if (start && date < startOfDay(start)) return false;
  if (end && date > endOfDay(end)) return false;
  return true;
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
  end?: Date | null
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
    if (!inDateRange(tx.createdAt, start, end)) continue;

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
