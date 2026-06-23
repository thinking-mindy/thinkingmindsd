import type { Receipt } from "@/app/(minds)/pos/types";

export type CashierReceiptSource = {
  _id?: string;
  type?: string;
  amount?: number;
  createdAt?: string | Date;
  description?: string;
  reference?: string;
  paymentType?: string;
  accountCategory?: string;
  paymentMethod?: string;
  isSchoolPayment?: boolean;
  studentId?: string;
  studentNumber?: string;
  studentName?: string;
  className?: string;
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

export function cashierTransactionToReceipt(tx: CashierReceiptSource): Receipt {
  const amount = Math.abs(tx.amount || 0);
  const typeLabel = TYPE_LABELS[tx.type ?? ""] ?? tx.type ?? "Payment";
  const studentNote =
    tx.isSchoolPayment && tx.studentName
      ? `Student: ${tx.studentName}${tx.studentNumber ? ` (${tx.studentNumber})` : ""}${tx.className ? ` · ${tx.className}` : ""}`
      : null;
  const lineName =
    tx.description?.trim() ||
    [studentNote, tx.paymentType, typeLabel, tx.accountCategory].filter(Boolean).join(" · ");

  const method = mapPaymentMethod(tx.paymentMethod);
  const id =
    tx.reference?.trim() ||
    (tx._id ? `CASH-${String(tx._id).slice(-8).toUpperCase()}` : `CASH-${Date.now()}`);

  const date =
    tx.createdAt instanceof Date
      ? tx.createdAt.toISOString()
      : tx.createdAt
        ? new Date(tx.createdAt).toISOString()
        : new Date().toISOString();

  const termFeesTotal = Number(tx.termFeesTotal ?? 0);
  const termFeesPaid = Number(tx.termFeesPaid ?? 0);
  const termFeesRemaining = Number(tx.termFeesRemaining ?? 0);
  const isSchool = Boolean(tx.isSchoolPayment && tx.studentId);
  const hasSchoolFeeSummary = isSchool && termFeesTotal > 0;

  return {
    id,
    date,
    entries: [
      {
        item: {
          id: String(tx._id ?? id),
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
      paidAmount: tx.type === "refund" || tx.type === "withdrawal" ? undefined : amount,
      reference: tx.reference || undefined,
      paynowNumber: method === "paynow" && tx.reference ? tx.reference : undefined,
      cardReference: method === "card" && tx.reference ? tx.reference : undefined,
    },
    schoolFee: hasSchoolFeeSummary
      ? {
          studentNumber: tx.studentNumber,
          studentName: tx.studentName,
          className: tx.className,
          termLabel: tx.schoolTermLabel ?? "Current term",
          termFeesTotal,
          paidThisTerm: termFeesPaid,
          remainingBalance: termFeesRemaining,
          percentPaid:
            termFeesTotal > 0 ? Math.min(100, Math.round((termFeesPaid / termFeesTotal) * 100)) : 0,
        }
      : undefined,
  };
}
