const CONNECTIVITY_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'ECONNRESET',
  'ENETUNREACH',
  'EHOSTUNREACH',
]);

export const FISCAL_OFFLINE_MESSAGE =
  'ZIMRA fiscalisation requires an internet connection to FDMS. This sale was completed without a fiscal receipt. Sync when you are back online.';

export const FISCAL_OFFLINE_CREDIT_NOTE_MESSAGE =
  'ZIMRA credit note requires an internet connection to FDMS. The refund was recorded locally without a fiscal credit note. Submit to FDMS when you are back online.';

export function isFdmsConnectivityError(error: unknown): boolean {
  if (!error) return false;

  const err = error as NodeJS.ErrnoException & { code?: string; cause?: unknown };
  const code = err.code ?? (err.cause as NodeJS.ErrnoException | undefined)?.code;
  if (code && CONNECTIVITY_CODES.has(code)) return true;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('fdms request timed out')) return true;
  if (/\bfdms\s+(500|502|503|504)\b/i.test(message)) return true;
  if (lower.includes('network') && lower.includes('error')) return true;
  if (lower.includes('getaddrinfo')) return true;
  if (lower.includes('socket hang up')) return true;

  return false;
}
