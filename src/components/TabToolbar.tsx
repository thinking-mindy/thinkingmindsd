"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export default function TabToolbar({
  title,
  subtitle,
  chips,
  actions,
}: {
  title: string;
  subtitle?: string;
  chips?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        <Typography variant="h5" fontWeight={800}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
        {chips && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            {chips}
          </Stack>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          {actions}
        </Stack>
      )}
    </Box>
  );
}

export function StatChip({
  icon,
  label,
  color = "default",
}: {
  icon?: ReactNode;
  label: string;
  color?: "default" | "primary" | "success" | "warning" | "error" | "info";
}) {
  return <Chip size="small" icon={icon as any} label={label} color={color} variant="outlined" sx={{ fontWeight: 600 }} />;
}
