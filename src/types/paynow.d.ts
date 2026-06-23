declare module 'paynow' {
  export interface InitResponse {
    success: boolean;
    status: string;
    hasRedirect: boolean;
    redirectUrl?: string;
    pollUrl?: string;
    instructions?: string;
    error?: string;
    isInnbucks: boolean;
    innbucks_info?: Array<{
      authorizationcode: string;
      deep_link_url: string;
      qr_code: string;
      expires_at: string;
    }>;
    hash?: string;
  }

  export interface StatusResponse {
    reference?: string;
    amount?: string;
    paynowReference?: string;
    pollUrl?: string;
    status?: string;
    error?: string;
    hash?: string;
    paid?(): boolean;
  }

  // Note: pollTransaction actually returns InitResponse, not StatusResponse
  // This is a known issue with the PayNow npm package

  export class Payment {
    constructor(reference: string, authEmail: string, items?: any);
    add(title: string, amount: number, quantity?: number): Payment;
    info(): any;
    total(): number;
  }

  export class Paynow {
    integrationId: string;
    integrationKey: string;
    resultUrl?: string;
    returnUrl?: string;

    constructor(
      integrationId: string,
      integrationKey: string,
      resultUrl?: string,
      returnUrl?: string
    );

    createPayment(reference: string, authEmail: string): Payment;
    send(payment: Payment): Promise<InitResponse>;
    /** Push payment to customer's phone (USSD). phone: e.g. 0771234567 or 263771234567; method: 'ecocash' | 'onemoney' */
    sendMobile(payment: Payment, phone: string, method: string): Promise<InitResponse>;
    pollTransaction(pollUrl: string): Promise<StatusResponse>;
  }
}

