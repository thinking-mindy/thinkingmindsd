import { buildDeviceSignature } from './signature';
import { toCents } from './math';
import type { ReceiptTaxLine } from './signature';
import type { FiscalDayCounter } from './types';

const COUNTER_ORDER: Record<FiscalDayCounter['fiscalCounterType'], number> = {
  SaleByTax: 1,
  SaleTaxByTax: 2,
  CreditNoteByTax: 3,
  CreditNoteTaxByTax: 4,
  DebitNoteByTax: 5,
  DebitNoteTaxByTax: 6,
  BalanceByMoneyType: 7,
};

const MONEY_TYPE_LABEL: Record<number, string> = {
  0: 'CASH',
  1: 'CARD',
};

function counterKey(c: FiscalDayCounter): string {
  return [
    c.fiscalCounterType,
    c.fiscalCounterCurrency,
    c.fiscalCounterTaxID ?? '',
    c.fiscalCounterTaxPercent ?? '',
    c.fiscalCounterMoneyType ?? '',
  ].join('|');
}

function upsertCounter(counters: FiscalDayCounter[], next: FiscalDayCounter): FiscalDayCounter[] {
  const key = counterKey(next);
  const copy = [...counters];
  const idx = copy.findIndex((c) => counterKey(c) === key);
  if (idx >= 0) {
    copy[idx] = {
      ...copy[idx],
      fiscalCounterValue: Math.round((copy[idx].fiscalCounterValue + next.fiscalCounterValue) * 100) / 100,
    };
  } else {
    copy.push(next);
  }
  return copy.filter((c) => Math.abs(c.fiscalCounterValue) >= 0.005);
}

export function accumulateSaleCounters(
  counters: FiscalDayCounter[],
  currency: string,
  receiptTaxes: ReceiptTaxLine[],
  payments: Array<{ moneyTypeCode: number; paymentAmount: number }>
): FiscalDayCounter[] {
  let next = [...counters];
  for (const tax of receiptTaxes) {
    const sales = tax.salesAmountWithTax;
    const taxAmt = tax.taxAmount;
    next = upsertCounter(next, {
      fiscalCounterType: 'SaleByTax',
      fiscalCounterCurrency: currency,
      fiscalCounterTaxID: tax.taxID,
      fiscalCounterTaxPercent: tax.taxPercent,
      fiscalCounterValue: sales,
    });
    next = upsertCounter(next, {
      fiscalCounterType: 'SaleTaxByTax',
      fiscalCounterCurrency: currency,
      fiscalCounterTaxID: tax.taxID,
      fiscalCounterTaxPercent: tax.taxPercent,
      fiscalCounterValue: taxAmt,
    });
  }
  for (const p of payments) {
    next = upsertCounter(next, {
      fiscalCounterType: 'BalanceByMoneyType',
      fiscalCounterCurrency: currency,
      fiscalCounterMoneyType: p.moneyTypeCode,
      fiscalCounterValue: p.paymentAmount,
    });
  }
  return next;
}

export function accumulateCreditNoteCounters(
  counters: FiscalDayCounter[],
  currency: string,
  receiptTaxes: ReceiptTaxLine[],
  payments: Array<{ moneyTypeCode: number; paymentAmount: number }>
): FiscalDayCounter[] {
  const negTaxes = receiptTaxes.map((t) => ({
    ...t,
    taxAmount: -Math.abs(t.taxAmount),
    salesAmountWithTax: -Math.abs(t.salesAmountWithTax),
  }));
  const negPayments = payments.map((p) => ({
    ...p,
    paymentAmount: -Math.abs(p.paymentAmount),
  }));

  let next = [...counters];
  for (const tax of negTaxes) {
    next = upsertCounter(next, {
      fiscalCounterType: 'CreditNoteByTax',
      fiscalCounterCurrency: currency,
      fiscalCounterTaxID: tax.taxID,
      fiscalCounterTaxPercent: tax.taxPercent,
      fiscalCounterValue: tax.salesAmountWithTax,
    });
    next = upsertCounter(next, {
      fiscalCounterType: 'CreditNoteTaxByTax',
      fiscalCounterCurrency: currency,
      fiscalCounterTaxID: tax.taxID,
      fiscalCounterTaxPercent: tax.taxPercent,
      fiscalCounterValue: tax.taxAmount,
    });
  }
  for (const p of negPayments) {
    next = upsertCounter(next, {
      fiscalCounterType: 'BalanceByMoneyType',
      fiscalCounterCurrency: currency,
      fiscalCounterMoneyType: p.moneyTypeCode,
      fiscalCounterValue: p.paymentAmount,
    });
  }
  return next;
}

function formatTaxPercentForCloseDay(taxPercent?: number): string {
  if (taxPercent === undefined || taxPercent === null) return '';
  return Number(taxPercent).toFixed(2);
}

export function buildFiscalDaySignString(input: {
  deviceId: number;
  fiscalDayNo: number;
  fiscalDayDate: string;
  fiscalDayCounters: FiscalDayCounter[];
}): string {
  const sorted = [...input.fiscalDayCounters]
    .filter((c) => Math.abs(c.fiscalCounterValue) >= 0.005)
    .sort((a, b) => {
      const oa = COUNTER_ORDER[a.fiscalCounterType] ?? 99;
      const ob = COUNTER_ORDER[b.fiscalCounterType] ?? 99;
      if (oa !== ob) return oa - ob;
      if (a.fiscalCounterCurrency !== b.fiscalCounterCurrency) {
        return a.fiscalCounterCurrency.localeCompare(b.fiscalCounterCurrency);
      }
      const ta = a.fiscalCounterTaxID ?? a.fiscalCounterMoneyType ?? '';
      const tb = b.fiscalCounterTaxID ?? b.fiscalCounterMoneyType ?? '';
      if (ta !== tb) return String(ta).localeCompare(String(tb));
      return 0;
    });

  const countersPart = sorted
    .map((counter) => {
      const taxPct =
        counter.fiscalCounterTaxPercent !== undefined
          ? formatTaxPercentForCloseDay(counter.fiscalCounterTaxPercent)
          : '';
      const money =
        counter.fiscalCounterMoneyType !== undefined
          ? MONEY_TYPE_LABEL[counter.fiscalCounterMoneyType] ?? ''
          : '';
      const value = toCents(counter.fiscalCounterValue);
      return `${counter.fiscalCounterType.toUpperCase()}${counter.fiscalCounterCurrency.toUpperCase()}${taxPct}${money}${value}`;
    })
    .join('');

  return `${input.deviceId}${input.fiscalDayNo}${input.fiscalDayDate}${countersPart}`;
}

export function buildCloseDayPayload(input: {
  deviceId: number;
  fiscalDayNo: number;
  fiscalDayDate: string;
  fiscalDayCounters: FiscalDayCounter[];
  receiptCounter: number;
  privateKeyPem: string;
}) {
  const signString = buildFiscalDaySignString({
    deviceId: input.deviceId,
    fiscalDayNo: input.fiscalDayNo,
    fiscalDayDate: input.fiscalDayDate,
    fiscalDayCounters: input.fiscalDayCounters,
  });

  const fiscalDayDeviceSignature = buildDeviceSignature(signString, input.privateKeyPem);

  const nonZeroCounters = input.fiscalDayCounters.filter((c) => Math.abs(c.fiscalCounterValue) >= 0.005);

  return {
    deviceID: input.deviceId,
    fiscalDayNo: input.fiscalDayNo,
    fiscalDayCounters: nonZeroCounters,
    fiscalDayDeviceSignature,
    receiptCounter: input.receiptCounter,
  };
}

export function fiscalDayDateFromOpenedAt(openedAt?: string): string {
  if (!openedAt) return new Date().toISOString().slice(0, 10);
  return openedAt.slice(0, 10);
}
