export type ReceiptDesignSettings = {
  showLogo: boolean;
  showCompanyName: boolean;
  showTagline: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  showTable: boolean;
  showReceiptId: boolean;
  showDate: boolean;
  showSubtotal: boolean;
  showTax: boolean;
  showPaidAmount: boolean;
  showChange: boolean;
  showPaymentReference: boolean;
  showPaynowNumber: boolean;
  showCardReference: boolean;
  showPaymentMethod: boolean;
  showQrCode: boolean;
  showFooterMessage: boolean;
};

export type ReceiptBranding = {
  companyName: string;
  logoUrl: string;
  tagline: string;
  phone?: string;
  email?: string;
  address?: string;
  footerText: string;
};

export type ReceiptDesignConfig = {
  settings: ReceiptDesignSettings;
  branding: ReceiptBranding;
};

export const DEFAULT_RECEIPT_DESIGN_SETTINGS: ReceiptDesignSettings = {
  showLogo: true,
  showCompanyName: true,
  showTagline: true,
  showPhone: true,
  showEmail: false,
  showAddress: false,
  showTable: true,
  showReceiptId: true,
  showDate: true,
  showSubtotal: true,
  showTax: true,
  showPaidAmount: true,
  showChange: true,
  showPaymentReference: true,
  showPaynowNumber: true,
  showCardReference: true,
  showPaymentMethod: true,
  showQrCode: true,
  showFooterMessage: true,
};

export type ReceiptFeatureDef = {
  key: keyof ReceiptDesignSettings;
  label: string;
};

export const RECEIPT_FEATURE_GROUPS: Array<{
  id: string;
  title: string;
  features: ReceiptFeatureDef[];
}> = [
  {
    id: "header",
    title: "Header & branding",
    features: [
      { key: "showLogo", label: "Company logo" },
      { key: "showCompanyName", label: "Company name" },
      { key: "showTagline", label: "Tagline" },
      { key: "showPhone", label: "Phone number" },
      { key: "showEmail", label: "Email address" },
      { key: "showAddress", label: "Address" },
    ],
  },
  {
    id: "order",
    title: "Order details",
    features: [
      { key: "showTable", label: "Table number" },
      { key: "showReceiptId", label: "Receipt ID" },
      { key: "showDate", label: "Date & time" },
    ],
  },
  {
    id: "totals",
    title: "Totals",
    features: [
      { key: "showSubtotal", label: "Subtotal" },
      { key: "showTax", label: "Tax line" },
    ],
  },
  {
    id: "payment",
    title: "Payment",
    features: [
      { key: "showPaidAmount", label: "Amount paid" },
      { key: "showChange", label: "Change" },
      { key: "showPaymentReference", label: "Payment reference" },
      { key: "showPaynowNumber", label: "PayNow / mobile" },
      { key: "showCardReference", label: "Card reference" },
      { key: "showPaymentMethod", label: "Payment method" },
    ],
  },
  {
    id: "footer",
    title: "Footer",
    features: [
      { key: "showQrCode", label: "QR code" },
      { key: "showFooterMessage", label: "Thank-you message" },
    ],
  },
];

/** Flat list of all receipt feature toggles */
export const RECEIPT_FEATURE_DEFS = RECEIPT_FEATURE_GROUPS.flatMap((g) => g.features);

export function mergeReceiptDesignSettings(
  stored?: Partial<ReceiptDesignSettings> | null
): ReceiptDesignSettings {
  return { ...DEFAULT_RECEIPT_DESIGN_SETTINGS, ...stored };
}

export function buildReceiptBranding(org: {
  name?: string;
  logoUrl?: string;
  email?: string;
  address?: string;
  orgSettings?: {
    tagline?: string;
    phone?: string;
    receiptFooter?: string;
  } | null;
}): ReceiptBranding {
  return {
    companyName: org.name?.trim() || "Thinking Minds",
    logoUrl: org.logoUrl?.trim() || "/logo.png",
    tagline: org.orgSettings?.tagline?.trim() || "...thinking in terms of lifetimes",
    phone: org.orgSettings?.phone?.trim() || undefined,
    email: org.email?.trim() || undefined,
    address: org.address?.trim() || undefined,
    footerText: org.orgSettings?.receiptFooter?.trim() || "Thank you!",
  };
}

export function buildReceiptDesignConfig(org: {
  name?: string;
  logoUrl?: string;
  email?: string;
  address?: string;
  orgSettings?: {
    tagline?: string;
    phone?: string;
    receiptFooter?: string;
  } | null;
  receiptDesignSettings?: Partial<ReceiptDesignSettings> | null;
}): ReceiptDesignConfig {
  return {
    settings: mergeReceiptDesignSettings(org.receiptDesignSettings),
    branding: buildReceiptBranding(org),
  };
}
