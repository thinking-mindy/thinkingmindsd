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
import type { ReactElement, ReactNode } from "react";
import ShellTabBar from "@/components/ShellTabBar";

export type ModuleTab = {
  id: number;
  label: string;
  description: string;
  icon: ReactElement;
  badge?: string | number;
  disabled?: boolean;
};

export type ModuleStat = {
  label: string;
  value: string | number;
  icon?: ReactElement;
  pulse?: boolean;
};

export default function ModuleShell({
  overline,
  title,
  subtitle,
  heroIcon,
  heroChips,
  statCards,
  alertSlot,
  tabIndex,
  onTabChange,
  tabs,
  children,
}: {
  overline: string;
  title: string;
  subtitle?: string;
  heroIcon?: ReactElement;
  heroChips?: ReactNode;
  statCards: ModuleStat[];
  alertSlot?: ReactNode;
  tabIndex: number;
  onTabChange: (index: number) => void;
  tabs: ModuleTab[];
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <Box sx={{ width: "100%", minHeight: "100%", pb: 4 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          p: { xs: 2.5, md: 3.5 },
          mb: 2,
          bgcolor: "background.paper",
          border: (t) => `1px solid ${alpha(t.palette.divider, 0.6)}`,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ md: "flex-end" }}
          gap={2}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            {heroIcon && (
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                  color: "primary.main",
                  flexShrink: 0,
                }}
              >
                {heroIcon}
              </Box>
            )}
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
                {overline}
              </Typography>
              <Typography variant="h4" fontWeight={800} lineHeight={1.15} color="text.primary">
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 520 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Stack>
          {heroChips && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {heroChips}
            </Stack>
          )}
        </Stack>

        {statCards.length > 0 && (
          <Grid container spacing={1.5} sx={{ mt: 2.5 }}>
            {statCards.map((card) => (
              <Grid key={card.label} size={{ xs: 6, sm: 3 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                    border: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}`,
                    animation: card.pulse ? "pulseGlow 2s ease-in-out infinite" : undefined,
                    "@keyframes pulseGlow": {
                      "0%, 100%": { boxShadow: `0 0 0 0 ${alpha(theme.palette.warning.main, 0.25)}` },
                      "50%": { boxShadow: `0 0 0 4px ${alpha(theme.palette.warning.main, 0)}` },
                    },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    {card.icon && (
                      <Box sx={{ display: "flex", color: "primary.main" }}>{card.icon}</Box>
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                        {card.label}
                      </Typography>
                      <Typography variant="h6" fontWeight={800} lineHeight={1.2} color="text.primary">
                        {card.value}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {alertSlot}

      <ShellTabBar tabs={tabs} tabIndex={tabIndex} onTabChange={onTabChange} />

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: (t) => `1px solid ${alpha(t.palette.divider, 0.6)}`,
          p: { xs: 2, md: 3 },
          minHeight: 400,
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}
