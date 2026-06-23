"use client";

import { Chip, Stack, Tab, Tabs } from "@mui/material";
import type { ReactElement } from "react";

export type ShellTab = {
  id: number;
  label: string;
  description?: string;
  icon?: ReactElement;
  disabled?: boolean;
  badge?: string | number;
};

export default function ShellTabBar({
  tabs,
  tabIndex,
  onTabChange,
}: {
  tabs: ShellTab[];
  tabIndex: number;
  onTabChange: (index: number) => void;
}) {
  return (
    <Tabs
      value={tabIndex}
      onChange={(_, value) => onTabChange(value as number)}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      sx={{
        mb: 2.5,
        borderBottom: 1,
        borderColor: "divider",
        "& .MuiTab-root": {
          textTransform: "none",
          fontWeight: 600,
          minHeight: 48,
          px: { xs: 1.5, sm: 2.5 },
        },
        "& .MuiTabs-indicator": {
          height: 3,
          borderRadius: "3px 3px 0 0",
        },
      }}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          value={tab.id}
          disabled={tab.disabled}
          icon={tab.icon}
          iconPosition="start"
          label={
            <Stack direction="row" spacing={0.75} alignItems="center">
              <span>{tab.label}</span>
              {tab.badge != null && Number(tab.badge) > 0 && (
                <Chip
                  size="small"
                  label={tab.badge}
                  color="warning"
                  sx={{
                    height: 20,
                    fontWeight: 700,
                    "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" },
                  }}
                />
              )}
            </Stack>
          }
        />
      ))}
    </Tabs>
  );
}
