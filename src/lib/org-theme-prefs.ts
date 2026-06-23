const STORAGE_KEY = "tm-org-theme";

export type OrgThemePrefs = {
  darkMode?: boolean;
  primaryColor?: string;
};

export function loadOrgThemePrefs(): OrgThemePrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OrgThemePrefs) : {};
  } catch {
    return {};
  }
}

export function saveOrgThemePrefs(prefs: OrgThemePrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  if (prefs.primaryColor) {
    document.documentElement.style.setProperty("--tm-primary", prefs.primaryColor);
  }
}

export function applyOrgThemePrefs(prefs: OrgThemePrefs): void {
  if (typeof window === "undefined") return;
  if (prefs.primaryColor) {
    document.documentElement.style.setProperty("--tm-primary", prefs.primaryColor);
  }
}
