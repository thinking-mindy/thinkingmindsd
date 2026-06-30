import type { ObjectId } from 'mongodb';
import type { FinancePaymentType, FinanceSettings } from '@/types/database';

/** Default cashier categories & payment types (not a server action export). */
export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  defaultCurrency: 'USD',
  accountCategories: [
    { id: 'cash', name: 'Cash', slug: 'cash', enabled: true },
    { id: 'bank', name: 'Bank', slug: 'bank', enabled: true },
    { id: 'other', name: 'Other', slug: 'other', enabled: true },
  ],
  paymentTypes: [
    { id: 'tuition-fees', name: 'Tuition Fees', enabled: true },
    { id: 'transport', name: 'Transport', enabled: true },
    { id: 'uniform-fee', name: 'Uniform Fee', enabled: true },
    { id: 'general-sale', name: 'General Sale', enabled: true },
    { id: 'supplies', name: 'Supplies', enabled: true },
    { id: 'services', name: 'Services', enabled: true },
    { id: 'misc', name: 'Miscellaneous', enabled: true },
  ],
};

export const SCHOOL_PAYMENT_TYPE_IDS = new Set([
  'tuition-fees',
  'transport',
  'uniform-fee',
]);

const SCHOOL_NAME_PATTERN = /\b(tuition|transport|uniform|school\s*fee|enrolment|enrollment)\b/i;

export function isSchoolPaymentType(pt: { id: string; name: string }): boolean {
  if (SCHOOL_PAYMENT_TYPE_IDS.has(pt.id)) return true;
  return SCHOOL_NAME_PATTERN.test(pt.name);
}

export function isTuitionPaymentType(pt: { id: string; name: string }): boolean {
  const id = pt.id.toLowerCase();
  const name = pt.name.toLowerCase();
  if (id === 'transport' || name.includes('transport')) return false;
  if (id === 'uniform-fee' || name.includes('uniform')) return false;
  return id === 'tuition-fees' || name.includes('tuition') || isSchoolPaymentType(pt);
}

export function partitionPaymentTypes(types: FinancePaymentType[]) {
  const school = types.filter((pt) => pt.enabled && isSchoolPaymentType(pt));
  const general = types.filter((pt) => pt.enabled && !isSchoolPaymentType(pt));

  return {
    school: school.length ? school : DEFAULT_FINANCE_SETTINGS.paymentTypes.filter(isSchoolPaymentType),
    general: general.length
      ? general
      : DEFAULT_FINANCE_SETTINGS.paymentTypes.filter((pt) => !isSchoolPaymentType(pt)),
  };
}

export interface CashierTransaction {
  _id?: ObjectId;
  orgId: ObjectId;
  type: 'sale' | 'refund' | 'deposit' | 'withdrawal';
  amount: number;
  currency?: string;
  description?: string;
  cashierId?: string;
  reference?: string;
  paymentMethod?: 'cash' | 'card' | 'paynow' | 'bank_transfer';
  accountCategoryId?: string;
  accountCategory?: string;
  paymentTypeId?: string;
  paymentType?: string;
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
  createdAt: Date;
}

export type CreateCashierTransactionInput = {
  orgId: string | ObjectId;
  type: 'sale' | 'refund' | 'deposit' | 'withdrawal';
  amount: number;
  currency?: string;
  description?: string;
  cashierId?: string;
  reference?: string;
  paymentMethod?: 'cash' | 'card' | 'paynow' | 'bank_transfer';
  accountCategoryId?: string;
  accountCategory?: string;
  paymentTypeId?: string;
  paymentType?: string;
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

export type CashierTransactionFilters = {
  orgId?: string | ObjectId;
  cashierId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
};

export interface Budget {
  _id?: ObjectId;
  orgId: ObjectId;
  name: string;
  category: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  startDate: Date;
  endDate: Date;
  spent?: number;
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
  department?: string;
  project?: string;
  description?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdBy?: string;
  isRecurring?: boolean;
  parentBudgetId?: ObjectId;
  variance?: number;
  variancePercentage?: number;
  alerts?: Array<{ type: 'warning' | 'critical'; threshold: number; message: string }>;
  createdAt: Date;
  updatedAt: Date;
}
