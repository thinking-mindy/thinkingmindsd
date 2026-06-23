"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSchoolSettings } from "@/lib/desktop/school-bridge";
import { DEFAULT_SCHOOL_SETTINGS, getLevelMeta, institutionTitle } from "@/lib/school-levels";
import type { EducationLevel, SchoolSettings } from "@/types/school";

type SchoolLevelContextValue = {
  settings: SchoolSettings;
  enabledLevels: EducationLevel[];
  defaultLevel: EducationLevel;
  activeLevel: EducationLevel;
  setActiveLevel: (level: EducationLevel) => void;
  institutionTitle: string;
  refreshSettings: () => Promise<void>;
  loading: boolean;
};

const SchoolLevelContext = createContext<SchoolLevelContextValue | null>(null);

export function SchoolLevelProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [activeLevel, setActiveLevel] = useState<EducationLevel>(DEFAULT_SCHOOL_SETTINGS.defaultLevel);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    const res = await getSchoolSettings();
    if (res.success && res.data) {
      setSettings(res.data);
      setActiveLevel((prev) =>
        res.data!.enabledLevels.includes(prev) ? prev : res.data!.defaultLevel
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    void refreshSettings();
  }, []);

  const enabledLevels = settings?.enabledLevels ?? DEFAULT_SCHOOL_SETTINGS.enabledLevels;
  const defaultLevel = settings?.defaultLevel ?? DEFAULT_SCHOOL_SETTINGS.defaultLevel;

  const value = useMemo(
    () => ({
      settings: settings ?? {
        orgId: "",
        enabledLevels,
        defaultLevel,
        updatedAt: new Date().toISOString(),
      },
      enabledLevels,
      defaultLevel,
      activeLevel: enabledLevels.includes(activeLevel) ? activeLevel : defaultLevel,
      setActiveLevel,
      institutionTitle: settings?.institutionName || institutionTitle(enabledLevels),
      refreshSettings,
      loading,
    }),
    [settings, enabledLevels, defaultLevel, activeLevel, loading]
  );

  return <SchoolLevelContext.Provider value={value}>{children}</SchoolLevelContext.Provider>;
}

export function useSchoolLevel() {
  const ctx = useContext(SchoolLevelContext);
  if (!ctx) throw new Error("useSchoolLevel must be used within SchoolLevelProvider");
  return ctx;
}

export function useActiveLevelMeta() {
  const { activeLevel } = useSchoolLevel();
  return getLevelMeta(activeLevel);
}
