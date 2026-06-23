import type { EducationLevel } from "@/types/school";

export type EducationLevelMeta = {
  id: EducationLevel;
  label: string;
  shortLabel: string;
  tagline: string;
  classLabel: string;
  classPlural: string;
  gradeLabel: string;
  guardianLabel: string;
  feePeriodLabel: string;
  roomLabel: string;
  teacherLabel: string;
  studentLabel: string;
  templates: { name: string; gradeLevel: string; feesPerTerm?: number }[];
  gradeSuggestions: string[];
  accent: string;
};

export const EDUCATION_LEVEL_META: Record<EducationLevel, EducationLevelMeta> = {
  primary: {
    id: "primary",
    label: "Primary school",
    shortLabel: "Primary",
    tagline: "Foundation phase through upper primary",
    classLabel: "Class",
    classPlural: "Classes",
    gradeLabel: "Grade",
    guardianLabel: "Parent / guardian",
    feePeriodLabel: "Term",
    roomLabel: "Classroom",
    teacherLabel: "Class teacher",
    studentLabel: "Learner",
    templates: [
      { name: "Grade 1 Blue", gradeLevel: "Grade 1", feesPerTerm: 350 },
      { name: "Grade 2 Blue", gradeLevel: "Grade 2", feesPerTerm: 380 },
      { name: "Grade 3 Blue", gradeLevel: "Grade 3", feesPerTerm: 400 },
      { name: "Grade 4 Blue", gradeLevel: "Grade 4", feesPerTerm: 420 },
      { name: "Grade 5 Blue", gradeLevel: "Grade 5", feesPerTerm: 450 },
      { name: "Grade 6 Blue", gradeLevel: "Grade 6", feesPerTerm: 480 },
      { name: "Grade 7 Blue", gradeLevel: "Grade 7", feesPerTerm: 500 },
    ],
    gradeSuggestions: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7"],
    accent: "#2e7d32",
  },
  high_school: {
    id: "high_school",
    label: "High school",
    shortLabel: "High school",
    tagline: "O-Level and A-Level streams",
    classLabel: "Form",
    classPlural: "Forms",
    gradeLabel: "Form / stream",
    guardianLabel: "Parent / guardian",
    feePeriodLabel: "Term",
    roomLabel: "Room",
    teacherLabel: "Form teacher",
    studentLabel: "Student",
    templates: [
      { name: "Form 1A", gradeLevel: "Form 1", feesPerTerm: 550 },
      { name: "Form 2A", gradeLevel: "Form 2", feesPerTerm: 580 },
      { name: "Form 3 Sciences", gradeLevel: "Form 3", feesPerTerm: 620 },
      { name: "Form 4 Sciences", gradeLevel: "Form 4", feesPerTerm: 650 },
      { name: "Lower 6 Arts", gradeLevel: "Lower 6", feesPerTerm: 720 },
      { name: "Upper 6 Sciences", gradeLevel: "Upper 6", feesPerTerm: 750 },
    ],
    gradeSuggestions: ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"],
    accent: "#1565c0",
  },
  tertiary: {
    id: "tertiary",
    label: "Tertiary",
    shortLabel: "Tertiary",
    tagline: "College, polytechnic & university programmes",
    classLabel: "Programme",
    classPlural: "Programmes",
    gradeLabel: "Year / level",
    guardianLabel: "Sponsor / next of kin",
    feePeriodLabel: "Semester",
    roomLabel: "Campus / block",
    teacherLabel: "Programme coordinator",
    studentLabel: "Student",
    templates: [
      { name: "Diploma IT — Year 1", gradeLevel: "Year 1", feesPerTerm: 1200 },
      { name: "Diploma Business — Year 1", gradeLevel: "Year 1", feesPerTerm: 1100 },
      { name: "BSc Computer Science — Y1", gradeLevel: "Year 1", feesPerTerm: 1800 },
      { name: "BSc Accounting — Y2", gradeLevel: "Year 2", feesPerTerm: 1950 },
      { name: "MBA — Semester 1", gradeLevel: "Semester 1", feesPerTerm: 2500 },
    ],
    gradeSuggestions: ["Year 1", "Year 2", "Year 3", "Year 4", "Semester 1", "Semester 2"],
    accent: "#6a1b9a",
  },
};

export const ALL_EDUCATION_LEVELS: EducationLevel[] = ["primary", "high_school", "tertiary"];

export const DEFAULT_SCHOOL_SETTINGS = {
  enabledLevels: ALL_EDUCATION_LEVELS,
  defaultLevel: "primary" as EducationLevel,
};

export function getLevelMeta(level: EducationLevel): EducationLevelMeta {
  return EDUCATION_LEVEL_META[level];
}

export function levelLabel(level: EducationLevel): string {
  return EDUCATION_LEVEL_META[level].label;
}

export function resolveEducationLevel(
  value?: EducationLevel | string | null,
  fallback: EducationLevel = "primary"
): EducationLevel {
  if (value === "primary" || value === "high_school" || value === "tertiary") return value;
  return fallback;
}

export function institutionTitle(enabledLevels: EducationLevel[]): string {
  if (enabledLevels.length === 0) return "School management";
  if (enabledLevels.length === 3) return "Primary · High school · Tertiary";
  if (enabledLevels.length === 1) return EDUCATION_LEVEL_META[enabledLevels[0]].label;
  return enabledLevels.map((l) => EDUCATION_LEVEL_META[l].shortLabel).join(" · ");
}
