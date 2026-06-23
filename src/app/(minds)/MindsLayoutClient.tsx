"use client";

import React from "react";
import SideMenu from "@/components/SideMenu";
import { Box, Stack } from "@mui/material";
import AppNavbar from "@/components/AppNavbar";
import Header from "@/components/Header";
import Copyright from "@/internals/components/Copyright";
import LicenseGate from "@/components/LicenseGate";
import ModuleAccessGate from "@/components/ModuleAccessGate";
import AccessControlProvider from "@/components/AccessControlProvider";
import OrgThemePrefsLoader from "@/components/OrgThemePrefsLoader";
import { useAccessControl } from "@/hooks/useAccessControl";
import { loadAdminPanel } from "@/lib/desktop/admin-bridge";
import { buildMindsMenu, planBadgeFromLicense } from "./minds-layout-utils";

export default function MindsLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    role,
    allowedModules,
    userId,
    orgOwnerId,
    companyId,
    isOwner,
    isReady,
  } = useAccessControl();

  const [planSlug, setPlanSlug] = React.useState("free");
  const [planBadge, setPlanBadge] = React.useState("Free trial");

  React.useEffect(() => {
    if (!isReady || !companyId) return;
    let cancelled = false;

    loadAdminPanel(isOwner)
      .then((panel) => {
        if (cancelled || !panel) return;
        const slug =
          (panel.currentPlan as { slug?: string } | null)?.slug ?? "free";
        setPlanSlug(slug);
        setPlanBadge(planBadgeFromLicense(slug, panel.licenseStatus));
      })
      .catch((error) => {
        console.error("Failed to load plan info for side menu:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, isOwner, isReady]);

  const menuSections = React.useMemo(
    () =>
      buildMindsMenu(
        role,
        allowedModules ?? undefined,
        userId,
        orgOwnerId
      ),
    [role, allowedModules, userId, orgOwnerId]
  );

  const seed = React.useMemo(
    () => ({
      role,
      allowedModules,
      userId,
      orgOwnerId,
      companyId,
    }),
    [role, allowedModules, userId, orgOwnerId, companyId]
  );

  return (
    <AccessControlProvider seed={seed}>
      <Box sx={{ display: "flex" }}>
        <SideMenu
          sections={menuSections}
          planSlug={planSlug}
          planBadge={planBadge}
        />
        <AppNavbar
          sections={menuSections}
          planSlug={planSlug}
          planBadge={planBadge}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflow: "auto",
          }}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: "center",
              mx: 3,
              pb: 5,
              mt: { xs: 8, md: 0 },
            }}
          >
            <OrgThemePrefsLoader />
            <Header />
            <LicenseGate>
              <ModuleAccessGate>{children}</ModuleAccessGate>
            </LicenseGate>
            <Copyright sx={{ my: 4 }} />
          </Stack>
        </Box>
      </Box>
    </AccessControlProvider>
  );
}
