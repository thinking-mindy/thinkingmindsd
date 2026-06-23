import { ObjectId } from 'mongodb';
import type { ReceiptDesignSettings } from '@/lib/receipt-settings';

// User Types
export interface User {
  _id?: ObjectId;
  clerkId: string;
  orgId: ObjectId;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'user';
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Organization Types
export interface Org {
  _id?: ObjectId;
  name: string;
  email?: string;
  address?: string;
  taxId?: string;
  logoUrl?: string;
  planId?: ObjectId;
  ownerId?: string; // Clerk user ID of the owner
  /** When the 30-day trial started (set on org create or first license check). */
  trialStartedAt?: Date;
  /** Access expires after this date (trial end or subscription end). */
  licenseExpiresAt?: Date;
  billingStatus?: 'active' | 'past_due' | 'cancelled';
  apiKeys?: Array<{
    hashedKey: string;
    createdAt: Date;
    status: 'active' | 'revoked';
  }>;
  usage?: {
    month: {
      calls: number;
    };
  };
  notificationSettings?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  orgSettings?: {
    timezone?: string;
    dateFormat?: 'mdy' | 'dmy' | 'ymd';
    lowStockAlerts?: boolean;
    receiptFooter?: string;
    phone?: string;
    tagline?: string;
  };
  receiptDesignSettings?: ReceiptDesignSettings;
  themeSettings?: {
    darkMode?: boolean;
    primaryColor?: string;
  };
  /** Cashier account categories and fee payment types configured on the finance dashboard. */
  financeSettings?: FinanceSettings;
  createdAt: Date;
}

export interface FinanceAccountCategory {
  id: string;
  name: string;
  slug: 'cash' | 'bank' | 'other' | string;
  enabled: boolean;
}

export interface FinancePaymentType {
  id: string;
  name: string;
  enabled: boolean;
}

export interface FinanceSettings {
  accountCategories: FinanceAccountCategory[];
  paymentTypes: FinancePaymentType[];
  defaultCurrency?: string;
}

// Join Request Types
export interface JoinRequest {
  _id?: ObjectId;
  orgId: ObjectId;
  orgName: string;
  userId: string; // Clerk user ID
  userEmail: string;
  userName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string; // Clerk user ID of reviewer
}

// Plan Types
export interface Plan {
  _id?: ObjectId;
  slug: 'free' | 'vendor' | 'shop_owner' | 'company' | 'pro' | 'enterprise';
  name: string;
  description?: string;
  priceMonthly?: number;
  supportLevel?: 'community' | 'priority' | 'dedicated';
  customizable?: boolean;
  apiLimitMonthly: number;
  features: string[];
  priceId?: string; // Stripe price ID
}

// Usage Log Types
export interface UsageLog {
  _id?: ObjectId;
  orgId: ObjectId;
  apiKeyHash: string;
  route: string;
  timestamp: Date;
}

// Inventory Types
export interface InventoryItem {
  _id?: ObjectId;
  orgId: ObjectId;
  sku: string;
  name: string;
  quantity: number;
  location?: string;
  reorderLevel?: number;
  price?: number;
}

// Asset Types
export interface Asset {
  _id?: ObjectId;
  orgId: ObjectId;
  tag: string;
  type: string;
  serial?: string;
  assignedToUserId?: ObjectId;
  status: 'active' | 'maintenance' | 'retired' | 'lost';
  purchaseDate?: Date;
  depreciation?: number;
}

// Invoice Types
export interface Invoice {
  invoiceId?: ObjectId;
  orgId: ObjectId | string;
  customerName?: string;
  customerEmail?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  createdAt?: Date;
}

// Payment Types
export interface Payment {
  _id?: ObjectId;
  invoiceId: ObjectId;
  orgId: ObjectId;
  amount: number;
  method: 'credit_card' | 'bank_transfer' | 'cash' | 'check';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  paidAt?: Date;
  createdAt: Date;
}

export interface PlanPayment {
  _id?: ObjectId;
  orgId: ObjectId;
  planId?: ObjectId;
  planName?: string;
  amount: number;
  currency?: string;
  msisdn: string;
  reason?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'error';
  sourceReference: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastResponse?: Record<string, any>;
}

// Expense Types
export interface Expense {
  _id?: ObjectId;
  orgId: ObjectId;
  category: string;
  description: string;
  amount: number;
  date: Date;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: ObjectId;
  createdAt: Date;
}

// Helpdesk Types
export interface HelpdeskTicket {
  ticketId?: ObjectId;
  orgId: ObjectId;
  createdBy: ObjectId;
  assignedTo?: ObjectId;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  subject: string;
  messages: Array<{
    userId: ObjectId;
    message: string;
    timestamp: Date;
    attachments?: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// CRM Contact Types
export interface Contact {
  contactId?: ObjectId;
  orgId: ObjectId;
  name: string;
  emails: string[];
  phones: string[];
  company?: string;
  deals?: Array<{
    dealId: ObjectId;
    name: string;
    value: number;
    stage: string;
    probability: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Project Types
export interface Project {
  projectId?: ObjectId;
  orgId: ObjectId;
  name: string;
  description?: string;
  members: ObjectId[];
  status: string;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Task Types
export interface Task {
  taskId?: ObjectId;
  projectId?: ObjectId;
  orgId: ObjectId;
  name: string;
  description?: string;
  assignedTo?: ObjectId;
  status: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Payroll Types
export interface PayrollRecord {
  _id?: ObjectId;
  payPeriod: string;
  orgId: ObjectId;
  employeeId: ObjectId;
  gross: number;
  deductions: {
    tax: number;
    insurance?: number;
    retirement?: number;
    other?: number;
  };
  net: number;
  payslipUrl?: string;
  createdAt: Date;
}

// Purchase Order Types
export interface PurchaseOrder {
  poNumber?: ObjectId;
  orgId: ObjectId;
  vendor: string;
  vendorId?: ObjectId;
  lines: Array<{
    itemId?: ObjectId;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'received' | 'cancelled';
  requestedBy: ObjectId;
  approvedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Types
export interface Notification {
  _id?: ObjectId;
  orgId: ObjectId;
  type: 'email' | 'inapp';
  target: ObjectId | ObjectId[]; // User ID(s)
  payload: {
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  };
  sentAt?: Date;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

// Audit Log Types
export interface AuditLog {
  _id?: ObjectId;
  actorId: ObjectId;
  orgId: ObjectId;
  action: string;
  resource: string;
  resourceId?: ObjectId;
  before?: Record<string, any>;
  after?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// i18n Types
export interface I18nResource {
  _id?: ObjectId;
  key: string;
  translations: Record<string, string>; // { en: '', fr: '', etc. }
  lastUpdated: Date;
}

// Currency Types
export interface Currency {
  _id?: ObjectId;
  code: string; // 'USD', 'EUR', etc.
  decimals: number;
  symbol: string;
  exchangeRates?: {
    base: string;
    rates: Record<string, number>;
    lastUpdated: Date;
  };
}

