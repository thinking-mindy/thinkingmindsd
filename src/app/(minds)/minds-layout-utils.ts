import { canAccessPath, isCompanyOwner } from "@/lib/access-control";
import { NAV_SECTIONS, filterNavSections, type NavSection } from "@/lib/nav-menu";

export function buildMindsMenu(
  role: string | undefined,
  allowedModules: string[] | undefined,
  userId?: string,
  orgOwnerId?: string
): NavSection[] {
  const allow = (path: string) =>
    canAccessPath(role, allowedModules, path, userId, orgOwnerId);
  let sections = filterNavSections(NAV_SECTIONS, allow);

  if (!isCompanyOwner(role, userId, orgOwnerId)) {
    sections = sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => item.path !== "/admin" && !item.path.startsWith("/admin")
        ),
      }))
      .filter((s) => s.items.length > 0);
  }

  return sections;
}

export function planBadgeFromLicense(
  planSlug: string,
  license?: {
    isExpired?: boolean;
    isInTrial?: boolean;
    daysRemaining?: number;
  } | null
): string {
  if (license?.isExpired) return "Trial expired";
  if (license?.isInTrial && (license.daysRemaining ?? 0) > 0) {
    const days = Math.max(0, Math.round(license.daysRemaining ?? 0));
    return `Free trial · ${days}d left`;
  }
  if (planSlug === "free") return "Free trial";
  return planSlug;
}
