"use client";

import { useMemo, useState } from "react";
import { Box } from "@mui/material";
import { Class, Dashboard, Payments, People, School, Settings } from "@mui/icons-material";
import ModuleShell from "@/components/ModuleShell";
import { SchoolLevelProvider, useSchoolLevel } from "./components/SchoolLevelContext";
import SchoolDashboardTab from "./(pages)/dashboard";
import SchoolStudentsTab from "./(pages)/students";
import SchoolClassesTab from "./(pages)/classes";
import SchoolPaymentsTab from "./(pages)/payments";
import SchoolSettingsTab from "./(pages)/settings";

const tabComponents = [
  SchoolDashboardTab,
  SchoolStudentsTab,
  SchoolClassesTab,
  SchoolPaymentsTab,
  SchoolSettingsTab,
];

function SchoolPageInner() {
  const [tabIndex, setTabIndex] = useState(0);
  const { institutionTitle, enabledLevels } = useSchoolLevel();

  const tabs = useMemo(
    () => [
      { id: 0, label: "Dashboard", description: "Campus overview", icon: <Dashboard /> },
      { id: 1, label: "Students", description: "Enrolment by level", icon: <People /> },
      { id: 2, label: "Classes", description: "Grades & programmes", icon: <Class /> },
      { id: 3, label: "Fee payments", description: "Cashier ledger", icon: <Payments /> },
      { id: 4, label: "Settings", description: "Levels & campus", icon: <Settings /> },
    ],
    []
  );

  const ActiveTab = tabComponents[tabIndex];
  const levelSummary =
    enabledLevels.length === 3
      ? "Primary · High school · Tertiary"
      : enabledLevels.length === 1
        ? institutionTitle
        : `${enabledLevels.length} levels`;

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", py: 3, px: { xs: 2, md: 4 } }}>
      <ModuleShell
        overline="Education"
        title={institutionTitle}
        subtitle="Manage primary, high school, and tertiary streams — students, classes, term fees, and cashier payments."
        heroIcon={<School sx={{ fontSize: 30 }} />}
        statCards={[
          { label: "Levels", value: levelSummary, icon: <School /> },
          { label: "Students", value: "Directory", icon: <People /> },
          { label: "Classes", value: "Programmes", icon: <Class /> },
          { label: "Fees", value: "Payments", icon: <Payments /> },
        ]}
        tabIndex={tabIndex}
        onTabChange={setTabIndex}
        tabs={tabs}
      >
        <ActiveTab />
      </ModuleShell>
    </Box>
  );
}

export default function SchoolPage() {
  return (
    <SchoolLevelProvider>
      <SchoolPageInner />
    </SchoolLevelProvider>
  );
}
