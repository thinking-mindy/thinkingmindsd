import type { Receipt } from "@/app/(minds)/pos/types";
import { isTuitionPaymentType } from "@/lib/finance-shared";

export type CashierReceiptSource = {
  _id?: string;
  type?: string;
  amount?: number;
  createdAt?: string | Date;
  description?: string;
  reference?: string;
  paymentType?: string;
  paymentTypeId?: string;
  accountCategory?: string;
  paymentMethod?: string;
  isSchoolPayment?: boolean;
  studentId?: string;
  studentNumber?: string;
  studentName?: string;
  className?: string;
  cashierName?: string;
  schoolTermId?: string;
  schoolTermLabel?: string;
  termFeesTotal?: number;
  termFeesPaid?: number;
  termFeesRemaining?: number;
};

const TYPE_LABELS: Record<string, string> = {
  sale: "Sale",
  refund: "Refund",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
};

function mapPaymentMethod(method?: string): "cash" | "paynow" | "card" {
  if (method === "paynow") return "paynow";
  if (method === "card" || method === "bank_transfer") return "card";
  return "cash";
}

/** Fix receipts saved before the current payment was included in the fee snapshot. */
export function enrichSchoolFeeSnapshot(tx: CashierReceiptSource): CashierReceiptSource {
  if (!tx.isSchoolPayment || !tx.studentId) return tx;

  const paymentType = {
    id: String(tx.paymentTypeId ?? ""),
    name: String(tx.paymentType ?? ""),
  };
  if (!isTuitionPaymentType(paymentType)) return tx;

  const total = Number(tx.termFeesTotal ?? 0);
  if (total <= 0) return tx;

  const paymentAmount = Math.abs(Number(tx.amount ?? 0));
  if (paymentAmount <= 0 || tx.type === "refund" || tx.type === "withdrawal") return tx;

  let paid = Number(tx.termFeesPaid ?? 0);
  let remaining = Number(tx.termFeesRemaining ?? 0);

  const snapshotBalanced = Math.abs(paid + remaining - total) < 0.02;
  if (!snapshotBalanced) return tx;

  // Post-payment rows already include this sale in termFeesPaid (Rust additional_payment).
  const priorPaid = paid - paymentAmount;
  const looksPostPayment =
    paid >= paymentAmount - 0.02 &&
    Math.abs(priorPaid + remaining - (total - paymentAmount)) < 0.02;

  if (!looksPostPayment) {
    paid += paymentAmount;
    remaining = Math.max(0, total - paid);
  }

  return {
    ...tx,
    termFeesPaid: paid,
    termFeesRemaining: remaining,
  };
}

export function cashierTransactionToReceipt(tx: CashierReceiptSource): Receipt {
  const enriched = enrichSchoolFeeSnapshot(tx);
  const amount = Math.abs(enriched.amount || 0);
  const typeLabel = TYPE_LABELS[enriched.type ?? ""] ?? enriched.type ?? "Payment";
  const studentNote =
    enriched.isSchoolPayment && enriched.studentName
      ? `Student: ${enriched.studentName}${enriched.studentNumber ? ` (${enriched.studentNumber})` : ""}${enriched.className ? ` · ${enriched.className}` : ""}`
      : null;
  const lineName =
    enriched.description?.trim() ||
    [studentNote, enriched.paymentType, typeLabel, enriched.accountCategory].filter(Boolean).join(" · ");

  const method = mapPaymentMethod(enriched.paymentMethod);
  const id =
    enriched.reference?.trim() ||
    (enriched._id ? `CASH-${String(enriched._id).slice(-8).toUpperCase()}` : `CASH-${Date.now()}`);

  const date =
    enriched.createdAt instanceof Date
      ? enriched.createdAt.toISOString()
      : enriched.createdAt
        ? new Date(enriched.createdAt).toISOString()
        : new Date().toISOString();

  const termFeesTotal = Number(enriched.termFeesTotal ?? 0);
  const termFeesPaid = Number(enriched.termFeesPaid ?? 0);
  const termFeesRemaining = Number(enriched.termFeesRemaining ?? 0);
  const isSchool = Boolean(enriched.isSchoolPayment && enriched.studentId);
  const showTuitionStatement =
    isSchool &&
    termFeesTotal > 0 &&
    isTuitionPaymentType({
      id: String(enriched.paymentTypeId ?? ""),
      name: String(enriched.paymentType ?? ""),
    });

  return {
    id,
    date,
    cashierName: enriched.cashierName?.trim() || undefined,
    entries: [
      {
        item: {
          id: String(enriched._id ?? id),
          name: lineName,
          price: amount,
          img: "",
        },
        qty: 1,
      },
    ],
    subtotal: amount,
    tax: 0,
    total: amount,
    payment: {
      method,
      paidAmount: enriched.type === "refund" || enriched.type === "withdrawal" ? undefined : amount,
      reference: enriched.reference || undefined,
      paynowNumber: method === "paynow" && enriched.reference ? enriched.reference : undefined,
      cardReference: method === "card" && enriched.reference ? enriched.reference : undefined,
    },
    schoolFee: showTuitionStatement
      ? {
          studentNumber: enriched.studentNumber,
          studentName: enriched.studentName,
          className: enriched.className,
          termLabel: enriched.schoolTermLabel ?? "Current term",
          termFeesTotal,
          paidThisTerm: termFeesPaid,
          remainingBalance: termFeesRemaining,
          percentPaid:
            termFeesTotal > 0 ? Math.min(100, Math.round((termFeesPaid / termFeesTotal) * 100)) : 0,
        }
      : undefined,
  };
}
