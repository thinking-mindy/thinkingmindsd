"use client";

import { ToggleButton, ToggleButtonGroup, alpha } from "@mui/material";
import { MenuBook, PointOfSale } from "@mui/icons-material";

export type FinanceCategory = "ops" | "ledger";

type Props = {
  value: FinanceCategory;
  onChange: (category: FinanceCategory) => void;
};

export default function FinanceCategoryToggle({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_, v: FinanceCategory | null) => v && onChange(v)}
      size="small"
      sx={(t) => ({
        bgcolor: alpha(t.palette.divider, 0.12),
        borderRadius: 2,
        p: 0.5,
        "& .MuiToggleButton-root": {
          border: 0,
          borderRadius: 1.5,
          px: 2,
          py: 0.75,
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.8125rem",
          gap: 0.75,
          "&.Mui-selected": {
            bgcolor: "background.paper",
            boxShadow: t.shadows[1],
            color: "text.primary",
          },
        },
      })}
    >
      <ToggleButton value="ops">
        <PointOfSale sx={{ fontSize: 18 }} />
        Operations
      </ToggleButton>
      <ToggleButton value="ledger">
        <MenuBook sx={{ fontSize: 18 }} />
        General ledger
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
