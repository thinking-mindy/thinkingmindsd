"use client";

import { Box, LinearProgress, Stack, Typography, alpha, useTheme } from "@mui/material";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function CashierBreakdown({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number }[];
}) {
  const theme = useTheme();
  const sorted = [...items].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 5);
  const max = Math.max(...sorted.map((i) => Math.abs(i.value)), 1);

  if (sorted.length === 0) return null;

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        height: "100%",
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Stack spacing={1.75}>
        {sorted.map((item) => (
          <Box key={item.label}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" fontWeight={600} noWrap sx={{ maxWidth: "70%" }}>
                {item.label}
              </Typography>
              <Typography variant="caption" fontWeight={700} color={item.value < 0 ? "error.main" : "text.primary"}>
                {formatCurrency(item.value)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(Math.abs(item.value) / max) * 100}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                "& .MuiLinearProgress-bar": {
                  borderRadius: 3,
                  bgcolor: item.value < 0 ? theme.palette.error.main : theme.palette.primary.main,
                },
              }}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
