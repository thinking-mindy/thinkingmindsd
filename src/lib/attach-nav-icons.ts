"use client";

import type { ReactNode } from "react";
import type { NavSection, NavSectionWithIcons } from "@/lib/nav-menu";

export function attachIconsToSections(
  sections: NavSection[],
  iconMap: Record<string, ReactNode>
): NavSectionWithIcons[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      icon: iconMap[item.path] ?? iconMap[item.path.split("?")[0]] ?? null,
    })),
  }));
}
