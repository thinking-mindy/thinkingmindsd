"use client";

import { useEffect } from "react";
import { applyOrgThemePrefs, loadOrgThemePrefs } from "@/lib/org-theme-prefs";

/** Applies saved org theme preferences from localStorage on mount. */
export default function OrgThemePrefsLoader() {
  useEffect(() => {
    applyOrgThemePrefs(loadOrgThemePrefs());
  }, []);
  return null;
}
