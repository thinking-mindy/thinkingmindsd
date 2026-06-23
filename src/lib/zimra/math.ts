import { ZIMRA_STANDARD_VAT_PERCENT } from './constants';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** VAT extracted from tax-inclusive amount. */
export function taxFromInclusive(saleAmount: number, taxRate = ZIMRA_STANDARD_VAT_PERCENT): number {
  if (!taxRate) return 0;
  const divisor = 1 + taxRate / 100;
  const preTax = saleAmount / divisor;
  return round2(saleAmount - preTax);
}

/** VAT added to tax-exclusive amount. */
export function taxFromExclusive(saleAmount: number, taxRate = ZIMRA_STANDARD_VAT_PERCENT): number {
  if (!taxRate) return 0;
  return round2(saleAmount * (taxRate / 100));
}

export function toCents(amount: number): number {
  return Math.round(round2(amount) * 100);
}

export function formatTaxPercentForSignature(taxPercent?: number | null): string {
  if (taxPercent === undefined || taxPercent === null) return '';
  return `${Number(taxPercent).toFixed(2)}`;
}
