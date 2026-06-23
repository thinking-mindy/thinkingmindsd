import { createHash, createSign } from 'node:crypto';
import { formatTaxPercentForSignature, toCents } from './math';

export type ReceiptTaxLine = {
  taxID: number;
  taxPercent?: number;
  taxAmount: number;
  salesAmountWithTax: number;
  taxCode?: string;
};

export function sha256Base64(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('base64');
}

export function signRsaSha256(data: string, privateKeyPem: string): string {
  const signer = createSign('RSA-SHA256');
  signer.update(data, 'utf8');
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

export function concatenateReceiptTaxes(receiptTaxes: ReceiptTaxLine[]): string {
  const sorted = [...receiptTaxes].sort((a, b) => a.taxID - b.taxID);
  return sorted
    .map((tax) => {
      const pct = formatTaxPercentForSignature(tax.taxPercent);
      const taxAmt = toCents(tax.taxAmount);
      const salesAmt = toCents(tax.salesAmountWithTax);
      return `${pct}${taxAmt}${salesAmt}`;
    })
    .join('');
}

export function buildReceiptSignString(input: {
  deviceId: number;
  receiptType: string;
  receiptCurrency: string;
  receiptGlobalNo: number;
  receiptDate: string;
  receiptTotal: number;
  receiptTaxes: ReceiptTaxLine[];
  previousReceiptHash?: string;
}): string {
  const taxes = concatenateReceiptTaxes(input.receiptTaxes);
  const totalCents = toCents(input.receiptTotal);
  const base = `${input.deviceId}${input.receiptType.toUpperCase()}${input.receiptCurrency.toUpperCase()}${input.receiptGlobalNo}${input.receiptDate}${totalCents}${taxes}`;
  return input.previousReceiptHash ? `${base}${input.previousReceiptHash}` : base;
}

export function buildDeviceSignature(
  signString: string,
  privateKeyPem: string
): { hash: string; signature: string } {
  const hash = sha256Base64(signString);
  const signature = signRsaSha256(signString, privateKeyPem);
  return { hash, signature };
}

/** First 16 chars of MD5(hex(signature_bytes)) per ZIMRA QR rules. */
export function receiptQrDataFromSignature(signatureBase64: string): string {
  const bytes = Buffer.from(signatureBase64, 'base64');
  const hex = bytes.toString('hex');
  return createHash('md5').update(Buffer.from(hex, 'hex')).digest('hex').slice(0, 16).toUpperCase();
}

export function buildReceiptQrUrl(input: {
  qrUrl: string;
  deviceId: number;
  receiptDate: string;
  receiptGlobalNo: number;
  signatureBase64: string;
}): string {
  const base = input.qrUrl.endsWith('/') ? input.qrUrl : `${input.qrUrl}/`;
  const devicePart = String(input.deviceId).padStart(10, '0');
  const date = new Date(input.receiptDate);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const datePart = `${dd}${mm}${yyyy}`;
  const globalPart = String(input.receiptGlobalNo).padStart(10, '0');
  const qrData = receiptQrDataFromSignature(input.signatureBase64);
  return `${base}${devicePart}${datePart}${globalPart}${qrData}`;
}

export function formatVerificationCode(qrData: string): string {
  const clean = qrData.replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
  if (clean.length < 16) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}`;
}
