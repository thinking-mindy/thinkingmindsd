"use client";

import { Box, Grid, Typography, alpha, useTheme } from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  ReceiptLong,
  AccountBalanceWallet,
} from "@mui/icons-material";

export type CashierMetrics = {
  net: number;
  sales: number;
  refunds: number;
  count: number;
  avg: number;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
        bgcolor: alpha(theme.palette.background.paper, 0.9),
        height: "100%",
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(accent, 0.1),
          color: accent,
          "& .MuiSvgIcon-root": { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} lineHeight={1.2} noWrap>
          {label}
        </Typography>
        <Typography variant="subtitle1" fontWeight={800} lineHeight={1.3} noWrap>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.disabled" lineHeight={1.2} noWrap display="block">
            {sub}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function CashierStatCards({ metrics }: { metrics: CashierMetrics }) {
  const theme = useTheme();
  return (
    <Grid container spacing={1} sx={{ mb: 2 }}>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          label="Net collected"
          value={formatCurrency(metrics.net)}
          sub="After refunds"
          icon={<AccountBalanceWallet />}
          accent={theme.palette.success.main}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          label="Money in"
          value={formatCurrency(metrics.sales)}
          sub="Sales & deposits"
          icon={<TrendingUp />}
          accent={theme.palette.text.secondary}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          label="Money out"
          value={formatCurrency(metrics.refunds)}
          sub="Refunds"
          icon={<TrendingDown />}
          accent={theme.palette.error.main}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          label="Transactions"
          value={String(metrics.count)}
          sub={metrics.count > 0 ? `Avg ${formatCurrency(metrics.avg)}` : "None yet"}
          icon={<ReceiptLong />}
          accent={theme.palette.text.secondary}
        />
      </Grid>
    </Grid>
  );
}
