export type FiscalEnvironment = 'test' | 'production';

export type FiscalDayStatus =
  | 'FiscalDayClosed'
  | 'FiscalDayOpened'
  | 'FiscalDayCloseInitiated'
  | 'FiscalDayCloseFailed';

export type ZimraApplicableTax = {
  taxID: number;
  taxName: string;
  taxPercent?: number;
  validFrom?: string;
  validTill?: string;
};

export type ZimraFiscalSettings = {
  orgId: string;
  enabled: boolean;
  environment: FiscalEnvironment;
  deviceId: number;
  deviceSerialNo: string;
  activationKey?: string;
  deviceModelName: string;
  deviceModelVersion: string;
  certificatePem: string;
  privateKeyPem: string;
  receiptCurrency: 'USD' | 'ZWG';
  taxInclusive: boolean;
  /** Cached from getConfig */
  qrUrl?: string;
  taxPayerName?: string;
  taxPayerTIN?: string;
  vatNumber?: string;
  applicableTaxes?: ZimraApplicableTax[];
  updatedAt: string;
};

export type FiscalDayCounter = {
  fiscalCounterType:
    | 'SaleByTax'
    | 'SaleTaxByTax'
    | 'CreditNoteByTax'
    | 'CreditNoteTaxByTax'
    | 'DebitNoteByTax'
    | 'DebitNoteTaxByTax'
    | 'BalanceByMoneyType';
  fiscalCounterCurrency: string;
  fiscalCounterTaxID?: number;
  fiscalCounterTaxPercent?: number;
  fiscalCounterMoneyType?: number;
  fiscalCounterValue: number;
};

export type StoredOrderFiscal = FiscalReceiptResult & {
  receiptType?: 'FISCALINVOICE' | 'CREDITNOTE' | 'DEBITNOTE';
};

export type ZimraFiscalState = {
  orgId: string;
  fiscalDayNo: number;
  fiscalDayStatus: FiscalDayStatus;
  fiscalDayOpenedAt?: string;
  receiptCounter: number;
  receiptGlobalNo: number;
  previousReceiptHash?: string;
  lastReceiptId?: number;
  fiscalDayCounters?: FiscalDayCounter[];
  updatedAt: string;
};

export type FiscalReceiptResult = {
  receiptId: number;
  receiptGlobalNo: number;
  receiptCounter: number;
  fiscalDayNo: number;
  invoiceNo: string;
  verificationCode?: string;
  qrCodeUrl: string;
  receiptHash: string;
  serverDate?: string;
  receiptType?: 'FISCALINVOICE' | 'CREDITNOTE' | 'DEBITNOTE';
};

export type PosFiscalLineItem = {
  name: string;
  price: number;
  quantity: number;
  taxPercent?: number;
  hsCode?: string;
};

export type PosFiscalPayment = {
  method: 'cash' | 'paynow' | 'card' | 'ecocash';
  amount: number;
};
