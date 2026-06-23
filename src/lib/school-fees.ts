import { getSchoolTermForDate, schoolPaymentDelta, transactionInTerm, type SchoolTerm } from "@/lib/school-term";

export type StudentTermFeeBalance = {
  termId: string;
  termLabel: string;
  termShortLabel: string;
  feesPerTerm: number;
  paidThisTerm: number;
  remainingBalance: number;
  percentPaid: number;
  className?: string;
  studentName?: string;
  studentNumber?: string;
  hasClassFees: boolean;
};

type TxRow = {
  _id?: string;
  type?: string;
  amount?: number;
  createdAt?: Date | string;
  schoolTermId?: string;
  isSchoolPayment?: boolean;
  studentId?: string;
};

export function computeTermFeeBalance(params: {
  feesPerTerm: number;
  transactions: TxRow[];
  studentId: string;
  term?: SchoolTerm;
  additionalPayment?: number;
  excludeTxId?: string;
  studentName?: string;
  studentNumber?: string;
  className?: string;
}): StudentTermFeeBalance {
  const term = params.term ?? getSchoolTermForDate();
  const sid = String(params.studentId);

  let paid = 0;
  for (const tx of params.transactions) {
    if (!tx.isSchoolPayment) continue;
    if (String(tx.studentId) !== sid) continue;
    if (params.excludeTxId && String(tx._id) === params.excludeTxId) continue;
    if (!transactionInTerm(tx, term)) continue;
    paid += schoolPaymentDelta(tx.type, tx.amount);
  }

  paid = Math.max(0, paid);
  const feesPerTerm = Math.max(0, Number(params.feesPerTerm ?? 0));
  const withAdditional = paid + Math.max(0, Number(params.additionalPayment ?? 0));
  const remaining = Math.max(0, feesPerTerm - withAdditional);
  const percentPaid = feesPerTerm > 0 ? Math.min(100, Math.round((withAdditional / feesPerTerm) * 100)) : 0;

  return {
    termId: term.id,
    termLabel: term.label,
    termShortLabel: term.shortLabel,
    feesPerTerm,
    paidThisTerm: withAdditional,
    remainingBalance: remaining,
    percentPaid,
    className: params.className,
    studentName: params.studentName,
    studentNumber: params.studentNumber,
    hasClassFees: feesPerTerm > 0,
  };
}

export function formatSchoolCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
