import type { Plan } from "@/types/database";

/** Fallback when the free plan row is missing from the database. */
export const FREE_TRIAL_PLAN: Omit<Plan, "_id"> & { _id?: string } = {
  slug: "free",
  name: "Free Trial",
  description: "30-day trial with full access to all modules.",
  priceMonthly: 0,
  supportLevel: "community",
  customizable: false,
  apiLimitMonthly: 1000,
  features: [
    "POS (Point of Sale)",
    "Finance & Accounting",
    "Inventory Management",
    "Procurement",
    "HR & Payroll",
    "CRM, IT, Helpdesk, Currency, Audit",
    "All modules enabled for 30 days",
    "Community email support (48h SLA)",
    "Basic reporting & analytics",
  ],
};

export function isFreeTrialPlan(slug?: string | null): boolean {
  return !slug || slug === "free";
}
