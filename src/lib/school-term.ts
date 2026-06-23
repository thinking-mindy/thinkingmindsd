/** Three-term academic calendar (Jan–Apr, May–Aug, Sep–Dec). */

export interface SchoolTerm {
  id: string;
  label: string;
  shortLabel: string;
  startDate: Date;
  endDate: Date;
}

export function getSchoolTermForDate(date: Date = new Date()): SchoolTerm {
  const y = date.getFullYear();
  const m = date.getMonth();

  if (m <= 3) {
    return {
      id: `${y}-T1`,
      label: `Term 1 · Jan–Apr ${y}`,
      shortLabel: `T1 ${y}`,
      startDate: new Date(y, 0, 1),
      endDate: new Date(y, 3, 30, 23, 59, 59, 999),
    };
  }
  if (m <= 7) {
    return {
      id: `${y}-T2`,
      label: `Term 2 · May–Aug ${y}`,
      shortLabel: `T2 ${y}`,
      startDate: new Date(y, 4, 1),
      endDate: new Date(y, 7, 31, 23, 59, 59, 999),
    };
  }
  return {
    id: `${y}-T3`,
    label: `Term 3 · Sep–Dec ${y}`,
    shortLabel: `T3 ${y}`,
    startDate: new Date(y, 8, 1),
    endDate: new Date(y, 11, 31, 23, 59, 59, 999),
  };
}

export function transactionInTerm(
  tx: { createdAt?: Date | string; schoolTermId?: string },
  term: SchoolTerm
): boolean {
  if (tx.schoolTermId) return tx.schoolTermId === term.id;
  if (!tx.createdAt) return false;
  const d = new Date(tx.createdAt);
  return d >= term.startDate && d <= term.endDate;
}

export function schoolPaymentDelta(type?: string, amount?: number): number {
  const n = Math.abs(Number(amount ?? 0));
  if (type === "refund" || type === "withdrawal") return -n;
  return n;
}
