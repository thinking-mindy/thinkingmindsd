"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
  alpha,
  keyframes,
  useTheme,
} from "@mui/material";
import {
  ArrowForward,
  AutoAwesome,
  DashboardOutlined,
  ExitToApp,
  LogoutRounded,
  WorkspacePremium,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { LICENSE_RENEWAL_PATH } from "@/lib/app-config";
import { logout as authLogout } from "@/lib/desktop/auth-bridge";
import { quitApplication } from "@/lib/app-lifecycle";
import { isTauriDesktop } from "@/lib/desktop/runtime";

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
`;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const PRO_PERKS = [
  "All modules",
  "Advanced analytics",
  "Priority support",
  "API access",
];

interface UpgradePromptProps {
  moduleName: string;
  currentPlan?: string;
  trialExpired?: boolean;
}

export default function UpgradePrompt({
  moduleName,
  currentPlan = "Free",
  trialExpired = false,
}: UpgradePromptProps) {
  const theme = useTheme();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [quitting, setQuitting] = useState(false);

  const brand = theme.palette.primary.main;
  const accent = trialExpired ? theme.palette.warning.main : theme.palette.primary.main;

  const handleRenew = () => {
    router.push(LICENSE_RENEWAL_PATH);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authLogout();
      router.push("/sign-in");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleQuit = async () => {
    setQuitting(true);
    try {
      await quitApplication();
    } finally {
      setQuitting(false);
    }
  };

  const headline = trialExpired
    ? `${moduleName} is locked`
    : `${moduleName} needs Pro`;

  const subline = trialExpired
    ? "Your free trial has ended. Renew your licence to unlock every module and keep your data on this device."
    : `You're on the ${currentPlan} plan. Upgrade to Pro to open ${moduleName} and the rest of the premium toolkit.`;

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "min(72vh, 720px)",
        width: "100%",
        py: { xs: 4, md: 6 },
        px: 2,
        overflow: "hidden",
        animation: `${fadeUp} 0.55s ease-out`,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(/minds-bg.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.1,
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          bgcolor: alpha(theme.palette.background.default, 0.94),
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "10%",
          right: "10%",
          width: 100,
          height: 100,
          borderRadius: "50%",
          bgcolor: alpha(brand, 0.08),
          animation: `${float} 7s ease-in-out infinite`,
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "14%",
          left: "8%",
          width: 72,
          height: 72,
          borderRadius: "50%",
          bgcolor: alpha(accent, 0.08),
          animation: `${float} 9s ease-in-out infinite 1s`,
          pointerEvents: "none",
        }}
      />

      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          borderRadius: 4,
          p: { xs: 3, sm: 4 },
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${alpha(brand, 0.2)}`,
          boxShadow: `0 16px 48px ${alpha(theme.palette.common.black, 0.08)}`,
        }}
      >
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: brand,
              boxShadow: `0 8px 24px ${alpha(brand, 0.35)}`,
            }}
          >
            <WorkspacePremium sx={{ fontSize: 42, color: theme.palette.primary.contrastText }} />
          </Box>

          <Stack spacing={1} alignItems="center">
            <Chip
              icon={<AutoAwesome sx={{ fontSize: 16 }} />}
              label={trialExpired ? "Trial ended" : "Upgrade required"}
              size="small"
              color={trialExpired ? "warning" : "primary"}
              variant="outlined"
              sx={{ fontWeight: 700, letterSpacing: "0.04em" }}
            />
            <Typography
              variant="h4"
              color="text.primary"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {headline}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 400, lineHeight: 1.65 }}
            >
              {subline}
            </Typography>
          </Stack>

          <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1}>
            {PRO_PERKS.map((perk) => (
              <Chip
                key={perk}
                label={perk}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.72rem",
                  borderColor: alpha(brand, 0.25),
                  bgcolor: alpha(brand, 0.04),
                }}
              />
            ))}
          </Stack>

          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            onClick={handleRenew}
            endIcon={<ArrowForward />}
            sx={{
              py: 1.6,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 800,
              fontSize: "1rem",
              boxShadow: `0 6px 20px ${alpha(brand, 0.3)}`,
              "&:hover": {
                boxShadow: `0 8px 28px ${alpha(brand, 0.4)}`,
              },
            }}
          >
            Renew licence
          </Button>

          <Divider flexItem sx={{ borderColor: alpha(theme.palette.divider, 0.5) }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
              or
            </Typography>
          </Divider>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} width="100%">
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              startIcon={<DashboardOutlined />}
              onClick={() => router.push("/dashboard")}
              sx={{
                py: 1.25,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Dashboard
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              startIcon={loggingOut ? <CircularProgress size={18} /> : <LogoutRounded />}
              onClick={() => void handleLogout()}
              disabled={loggingOut || quitting}
              sx={{
                py: 1.25,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Log out
            </Button>
            <Button
              fullWidth
              variant="text"
              color="inherit"
              startIcon={quitting ? <CircularProgress size={18} /> : <ExitToApp />}
              onClick={() => void handleQuit()}
              disabled={loggingOut || quitting}
              sx={{
                py: 1.25,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                color: "text.secondary",
                "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.06), color: "error.main" },
              }}
            >
              {isTauriDesktop() ? "Quit app" : "Close tab"}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
