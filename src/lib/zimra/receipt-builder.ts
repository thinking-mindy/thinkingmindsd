import { DEFAULT_APPLICABLE_TAXES, MONEY_TYPE, ZIMRA_STANDARD_VAT_PERCENT } from './constants';
import { taxFromExclusive, taxFromInclusive } from './math';
import {
  buildDeviceSignature,
  buildReceiptSignString,
  type ReceiptTaxLine,
} from './signature';
import type { PosFiscalLineItem, PosFiscalPayment, ZimraApplicableTax } from './types';

export type CreditDebitNoteRef = {
  receiptID?: number;
  deviceID?: number;
  receiptGlobalNo: number;
  fiscalDayNo: number;
};

function resolveTaxId(
  taxPercent: number | undefined,
  applicableTaxes: ZimraApplicableTax[] | undefined,
  mapping: Record<string | number, number> = DEFAULT_APPLICABLE_TAXES
): number {
  if (taxPercent === undefined || taxPercent === null) {
    return mapping.exempt ?? 3;
  }
  if (taxPercent === 0) return mapping[0] ?? 2;
  if (taxPercent === 5) return mapping[5] ?? 514;
  if (taxPercent === 15.5) return mapping[15.5] ?? 515;
  if (taxPercent === 15) {
    const fromConfig = applicableTaxes?.find((t) => t.taxPercent === 15);
    if (fromConfig) return fromConfig.taxID;
    return mapping[15] ?? mapping[15.5] ?? 515;
  }
  const match = applicableTaxes?.find((t) => t.taxPercent === taxPercent);
  if (match) return match.taxID;
  return mapping[15.5] ?? 515;
}

function moneyTypeCode(method: PosFiscalPayment['method']): number {
  if (method === 'card') return MONEY_TYPE.CARD;
  return MONEY_TYPE.CASH;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildFiscalReceipt(input: {
  deviceId: number;
  privateKeyPem: string;
  receiptCounter: number;
  receiptGlobalNo: number;
  invoiceNo: string;
  receiptCurrency: 'USD' | 'ZWG';
  taxInclusive: boolean;
  items: PosFiscalLineItem[];
  payments: PosFiscalPayment[];
  applicableTaxes?: ZimraApplicableTax[];
  previousReceiptHash?: string;
  receiptDate?: string;
  receiptType?: 'FISCALINVOICE' | 'CREDITNOTE' | 'DEBITNOTE';
  receiptNotes?: string;
  creditDebitNote?: CreditDebitNoteRef;
}) {
  const receiptType = input.receiptType ?? 'FISCALINVOICE';
  const isCredit = receiptType === 'CREDITNOTE';
  const sign = isCredit ? -1 : 1;

  const receiptDate =
    input.receiptDate ??
    new Date().toISOString().replace(/\.\d{3}Z$/, '').slice(0, 19);

  const taxPercentDefault = ZIMRA_STANDARD_VAT_PERCENT;

  const receiptLines = input.items.map((item, index) => {
    const lineTotal = round2(item.price * item.quantity) * sign;
    const taxPercent = item.taxPercent ?? taxPercentDefault;
    const taxID = resolveTaxId(taxPercent, input.applicableTaxes);
    const line: Record<string, unknown> = {
      receiptLineType: 'Sale',
      receiptLineNo: index + 1,
      receiptLineHSCode: item.hsCode ?? '04021099',
      receiptLineName: item.name,
      receiptLinePrice: item.price,
      receiptLineQuantity: item.quantity,
      receiptLineTotal: lineTotal,
      taxID,
    };
    if (taxPercent > 0) line.taxPercent = taxPercent;
    return line;
  });

  const taxGroups = new Map<
    string,
    { taxID: number; taxPercent?: number; salesAmount: number }
  >();

  for (const line of receiptLines) {
    const taxID = line.taxID as number;
    const taxPercent = line.taxPercent as number | undefined;
    const key = `${taxID}:${taxPercent ?? 'exempt'}`;
    const existing = taxGroups.get(key) ?? { taxID, taxPercent, salesAmount: 0 };
    existing.salesAmount += line.receiptLineTotal as number;
    taxGroups.set(key, existing);
  }

  const receiptTaxes: ReceiptTaxLine[] = [];
  for (const group of Array.from(taxGroups.values())) {
    const rate = group.taxPercent ?? 0;
    const absSales = Math.abs(group.salesAmount);
    let taxAmount: number;
    let salesAmountWithTax: number;
    if (input.taxInclusive) {
      salesAmountWithTax = round2(absSales) * sign;
      taxAmount = taxFromInclusive(absSales, rate) * sign;
    } else {
      const preTax = round2(absSales);
      taxAmount = taxFromExclusive(preTax, rate) * sign;
      salesAmountWithTax = round2(preTax + Math.abs(taxAmount)) * sign;
    }
    const taxLine: ReceiptTaxLine = {
      taxID: group.taxID,
      taxAmount: round2(taxAmount),
      salesAmountWithTax: round2(salesAmountWithTax),
    };
    if (group.taxPercent !== undefined) taxLine.taxPercent = group.taxPercent;
    receiptTaxes.push(taxLine);
  }

  const receiptTotal = input.taxInclusive
    ? round2(receiptLines.reduce((s, l) => s + (l.receiptLineTotal as number), 0))
    : round2(receiptTaxes.reduce((s, t) => s + t.salesAmountWithTax, 0));

  const receiptPayments = input.payments.map((p) => ({
    moneyTypeCode: moneyTypeCode(p.method),
    paymentAmount: round2(Math.abs(p.amount)) * sign,
  }));

  const signString = buildReceiptSignString({
    deviceId: input.deviceId,
    receiptType,
    receiptCurrency: input.receiptCurrency,
    receiptGlobalNo: input.receiptGlobalNo,
    receiptDate,
    receiptTotal,
    receiptTaxes,
    previousReceiptHash: input.previousReceiptHash,
  });

  const receiptDeviceSignature = buildDeviceSignature(signString, input.privateKeyPem);

  const receipt: Record<string, unknown> = {
    receiptType,
    receiptCurrency: input.receiptCurrency,
    receiptCounter: input.receiptCounter,
    receiptGlobalNo: input.receiptGlobalNo,
    invoiceNo: input.invoiceNo,
    receiptDate,
    receiptLinesTaxInclusive: input.taxInclusive,
    receiptLines,
    receiptTaxes,
    receiptPayments,
    receiptTotal,
    receiptPrintForm: 'Receipt48',
    receiptDeviceSignature,
  };

  if (input.receiptNotes) receipt.receiptNotes = input.receiptNotes;
  if (input.creditDebitNote) receipt.creditDebitNote = input.creditDebitNote;

  return { receipt, receiptDeviceSignature, receiptTaxes, receiptTotal, receiptDate, receiptPayments };
}
