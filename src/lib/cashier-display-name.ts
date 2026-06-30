type CashierUserLike = {
  firstName?: string | null;
  fullName?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
};

export function getCashierDisplayName(user?: CashierUserLike | null): string {
  if (!user) return "Cashier";
  const first = user.firstName?.trim();
  if (first) return first;
  const full = user.fullName?.trim();
  if (full) return full.split(/\s+/)[0] ?? full;
  const email = user.primaryEmailAddress?.emailAddress?.split("@")[0]?.trim();
  return email || "Cashier";
}
