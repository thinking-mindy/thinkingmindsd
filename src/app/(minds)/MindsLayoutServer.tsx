import SideMenu from "@/components/SideMenu";
import { Box, Stack } from "@mui/material";
import AppNavbar from "@/components/AppNavbar";
import Header from "@/components/Header";
import Copyright from "@/internals/components/Copyright";
import LicenseGate from "@/components/LicenseGate";
import ModuleAccessGate from "@/components/ModuleAccessGate";
import AccessControlProvider from "@/components/AccessControlProvider";
import OrgThemePrefsLoader from "@/components/OrgThemePrefsLoader";
import { getLicenseStatus } from "@/_actions/licenses";
import { getOrg } from "@/_actions/orgs";
import { getPlan } from "@/_actions/plans";
import { getAccessSeedForLayout } from "@/lib/access-control-server";
import { buildMindsMenu, planBadgeFromLicense } from "./minds-layout-utils";

export default async function MindsLayoutServer({
  children,
}: {
  children: React.ReactNode;
}) {
  const accessSeed = await getAccessSeedForLayout();
  const { role, allowedModules, userId, orgOwnerId, companyId } = accessSeed;
  let planSlug = "free";
  let planBadge = "Free trial";

  if (companyId) {
    try {
      const [orgRes, license] = await Promise.all([
        getOrg(companyId),
        getLicenseStatus(companyId),
      ]);
      const orgData = orgRes.success
        ? (orgRes as { data?: { planId?: string } }).data
        : undefined;
      const planId = orgData?.planId;

      if (planId) {
        const planRes = await getPlan(planId);
        const planData = planRes.success
          ? (planRes as { data?: { slug?: string } }).data
          : undefined;
        if (planData?.slug) {
          planSlug = planData.slug;
        }
      }

      planBadge = planBadgeFromLicense(planSlug, license);
    } catch (error) {
      console.error("Failed to load plan info for side menu:", error);
    }
  }

  const menuSections = buildMindsMenu(
    role,
    allowedModules ?? undefined,
    userId,
    orgOwnerId
  );

  return (
    <AccessControlProvider seed={accessSeed}>
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
