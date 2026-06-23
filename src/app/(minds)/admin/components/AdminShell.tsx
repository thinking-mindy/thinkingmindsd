"use client";

import {
  Box,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import type { ReactElement } from "react";
import ShellTabBar from "@/components/ShellTabBar";
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import GroupAddOutlined from "@mui/icons-material/GroupAddOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import WorkspacePremiumOutlined from "@mui/icons-material/WorkspacePremiumOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import BackupOutlined from "@mui/icons-material/BackupOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";

export type AdminTab = {
  id: number;
  label: string;
  description: string;
  icon: ReactElement;
  disabled?: boolean;
  badge?: string | number;
};

export default function AdminShell({
  tabIndex,
  onTabChange,
  companyName,
  planName,
  planSlug,
  isFreeTrial = false,
  trialDaysRemaining,
  stats,
  tabs,
  children,
}: {
  tabIndex: number;
  onTabChange: (index: number) => void;
  companyName?: string;
  planName?: string;
  planSlug?: string;
  isFreeTrial?: boolean;
  trialDaysRemaining?: number;
  stats: { members: number; pendingRequests: number; apiUsed: number; apiLimit: number };
  tabs: AdminTab[];
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const apiPct = stats.apiLimit > 0 ? Math.round((stats.apiUsed / stats.apiLimit) * 100) : 0;

  return (
    <Box sx={{ width: "100%", minHeight: "100%", pb: 4 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          bgcolor: "background.paper",
          border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
              }}
            >
              <AdminPanelSettingsOutlined sx={{ fontSize: 30 }} />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
                Organisation control
              </Typography>
              <Typography variant="h4" fontWeight={800} lineHeight={1.15} color="text.primary">
                {companyName || "Administration"}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                {isFreeTrial ? (
                  <Chip
                    size="small"
                    icon={<WorkspacePremiumOutlined sx={{ fontSize: 16 }} />}
                    label={
                      trialDaysRemaining != null
                        ? `Free trial · ${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left`
                        : "Free trial"
                    }
                    color={trialDaysRemaining != null && trialDaysRemaining <= 7 ? "warning" : "info"}
                    sx={{ fontWeight: 700 }}
                  />
                ) : (
                  <>
                    {planName && (
                      <Chip
                        size="small"
                        icon={<WorkspacePremiumOutlined sx={{ fontSize: 16 }} />}
                        label={planName}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                    {planSlug && (
                      <Chip size="small" label={planSlug.toUpperCase()} variant="outlined" />
                    )}
                  </>
                )}
              </Stack>
            </Box>
          </Stack>

          <Grid container spacing={1} sx={{ maxWidth: 520 }}>
            {[
              { label: "Team", value: String(stats.members) },
              { label: "Pending", value: String(stats.pendingRequests) },
              { label: "API use", value: `${apiPct}%` },
            ].map((s) => (
              <Grid key={s.label} size={{ xs: 4 }}>
                <Box
                  sx={{
                    textAlign: "center",
                    px: 1,
                    py: 1.25,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    {s.label}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="text.primary">
                    {s.value}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Paper>

      <ShellTabBar tabs={tabs} tabIndex={tabIndex} onTabChange={onTabChange} />

      <Box>{children}</Box>
    </Box>
  );
}

export const ADMIN_TAB_ICONS = {
  company: <BusinessOutlined />,
  requests: <GroupAddOutlined />,
  members: <GroupsOutlined />,
  plan: <WorkspacePremiumOutlined />,
  settings: <TuneOutlined />,
  backup: <BackupOutlined />,
  receipt: <ReceiptLongOutlined />,
  localUsers: <ManageAccountsOutlined />,
};
