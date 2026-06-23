import { ZIMRA_STANDARD_VAT_PERCENT } from '@/lib/zimra/constants';

/** POS default VAT rate (Zimbabwe standard rated). */
export const POS_VAT_RATE = ZIMRA_STANDARD_VAT_PERCENT / 100;

export function posTaxLabel(): string {
  return `VAT (${ZIMRA_STANDARD_VAT_PERCENT}%)`;
}
