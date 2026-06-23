"use client";

import { Box, Typography, alpha, styled, Chip } from "@mui/material";
import { ReceiptLongOutlined } from "@mui/icons-material";
import type { ReactNode } from "react";

const Card = styled(Box, {
  shouldForwardProp: (p) => p !== "$selected" && p !== "$accent",
})<{ $selected?: boolean; $accent?: string }>(({ theme, $selected, $accent }) => {
  const accent = $accent ?? theme.palette.primary.main;
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(1),
    padding: theme.spacing(1.75, 2),
    borderRadius: 14,
    border: `2px solid ${$selected ? accent : alpha(theme.palette.divider, 0.45)}`,
    background: $selected ? alpha(accent, 0.1) : theme.palette.background.paper,
    cursor: "pointer",
    transition: "all 0.2s ease",
    minHeight: 96,
    "&:hover": {
      borderColor: accent,
      transform: "translateY(-2px)",
      boxShadow: `0 8px 20px ${alpha(accent, 0.14)}`,
    },
  };
});

export default function PaymentTypeCard({
  name,
  subtitle,
  icon,
  selected,
  accentColor,
  onSelect,
}: {
  name: string;
  subtitle?: string;
  icon?: ReactNode;
  selected?: boolean;
  accentColor?: string;
  onSelect: () => void;
}) {
  return (
    <Card
      $selected={selected}
      $accent={accentColor}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <Box
        sx={(theme) => ({
          width: 36,
          height: 36,
          borderRadius: 1.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(accentColor ?? theme.palette.primary.main, selected ? 0.22 : 0.1),
          color: accentColor ?? "primary.main",
        })}
      >
        {icon ?? <ReceiptLongOutlined sx={{ fontSize: 20 }} />}
      </Box>
      <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.25 }}>
        {name}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
          {subtitle}
        </Typography>
      )}
      {selected && (
        <Chip label="Selected" size="small" color="primary" sx={{ height: 20, fontSize: "0.65rem", mt: "auto" }} />
      )}
    </Card>
  );
}
