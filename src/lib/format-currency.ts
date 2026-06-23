/** Signed USD (net income, variance) — fixes negative zero, keeps real negatives. */
export function formatUsd(amount: number | string | null | undefined): string {
  const parsed =
    typeof amount === 'string' ? Number.parseFloat(amount) : Number(amount);
  const value = Number.isFinite(parsed) ? (parsed === 0 ? 0 : parsed) : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Currency totals that should read as positive magnitudes (income, expenses, sales). */
export function formatUsdMagnitude(amount: number | string | null | undefined): string {
  const parsed =
    typeof amount === 'string' ? Number.parseFloat(amount) : Number(amount);
  const value = Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  return formatUsd(value);
}

/** Drop-in for finance stat cards and tables (positive totals). */
export const formatCurrency = formatUsdMagnitude;
