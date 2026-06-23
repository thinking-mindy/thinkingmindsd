export type MenuCategory = {
  id: string;
  title: string;
  itemsCount?: number;
};

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  img: string;
  categoryId?: string | null;
  sku?: string;
  quantity?: number;
};

export type PaymentInfo = {
  method: "cash" | "paynow" | "card";
  paidAmount?: number;
  changeAmount?: number;
  reference?: string;
  paynowNumber?: string;
  ecocashNumber?: string; // Keep for backward compatibility
  cardReference?: string;
};

export type CartEntry = { item: MenuItem; qty: number };
export type CartState = Record<string, CartEntry>;

export type HeldOrder = {
  id: string;
  label: string;
  cart: CartState;
  taxEnabled: boolean;
  heldAt: string;
};

export type SchoolFeeReceiptSummary = {
  studentNumber?: string;
  studentName?: string;
  className?: string;
  termLabel: string;
  termFeesTotal: number;
  paidThisTerm: number;
  remainingBalance: number;
  percentPaid: number;
};

export type FiscalReceiptInfo = {
  receiptId: number;
  receiptGlobalNo: number;
  receiptCounter: number;
  fiscalDayNo: number;
  invoiceNo: string;
  verificationCode?: string;
  qrCodeUrl: string;
  receiptHash: string;
};

export type Receipt = {
  id: string;
  date: string; // ISO or readable
  table?: string;
  entries: { item: MenuItem; qty: number }[];
  subtotal: number;
  tax: number;
  total: number;
  payment: PaymentInfo;
  schoolFee?: SchoolFeeReceiptSummary;
  fiscal?: FiscalReceiptInfo;
};