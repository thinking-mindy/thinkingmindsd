"use client";

import { Chip, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import ChildCareOutlined from "@mui/icons-material/ChildCareOutlined";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import { EDUCATION_LEVEL_META } from "@/lib/school-levels";
import { useSchoolLevel } from "./SchoolLevelContext";
import type { EducationLevel } from "@/types/school";

const LEVEL_ICONS: Record<EducationLevel, React.ReactNode> = {
  primary: <ChildCareOutlined sx={{ fontSize: 18 }} />,
  high_school: <SchoolOutlined sx={{ fontSize: 18 }} />,
  tertiary: <AccountBalanceOutlined sx={{ fontSize: 18 }} />,
};

export default function LevelSwitcher({ compact }: { compact?: boolean }) {
  const { enabledLevels, activeLevel, setActiveLevel } = useSchoolLevel();

  if (enabledLevels.length <= 1) {
    const meta = EDUCATION_LEVEL_META[enabledLevels[0] ?? "primary"];
    return (
      <Chip
        icon={LEVEL_ICONS[meta.id] as React.ReactElement}
        label={meta.label}
        color="primary"
        variant="outlined"
        sx={{ fontWeight: 700 }}
      />
    );
  }

  if (compact) {
    return (
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {enabledLevels.map((level) => {
          const meta = EDUCATION_LEVEL_META[level];
          const selected = activeLevel === level;
          return (
            <Chip
              key={level}
              icon={LEVEL_ICONS[level] as React.ReactElement}
              label={meta.shortLabel}
              onClick={() => setActiveLevel(level)}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              sx={{ fontWeight: 700 }}
            />
          );
        })}
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1.1}>
        Education level
      </Typography>
      <ToggleButtonGroup
        exclusive
        value={activeLevel}
        onChange={(_, v) => v && setActiveLevel(v)}
        sx={{ flexWrap: "wrap", gap: 1 }}
      >
        {enabledLevels.map((level) => {
          const meta = EDUCATION_LEVEL_META[level];
          return (
            <ToggleButton
              key={level}
              value={level}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                px: 2,
                py: 1,
                gap: 1,
                borderRadius: "12px !important",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {LEVEL_ICONS[level]}
              <Stack alignItems="flex-start" spacing={0}>
                <Typography variant="body2" fontWeight={800} lineHeight={1.2}>
                  {meta.shortLabel}
                </Typography>
                <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
                  {meta.tagline.split("—")[0].trim().slice(0, 28)}
                </Typography>
              </Stack>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </Stack>
  );
}
