"use client";

import { Box, Stack, Typography, alpha, useTheme } from "@mui/material";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";

export type ConfigSection = {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function ModuleConfigurationTab({
  moduleTitle,
  moduleDescription,
  sections,
}: {
  moduleTitle: string;
  moduleDescription: string;
  sections: ConfigSection[];
}) {
  const theme = useTheme();

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: "primary.main",
          }}
        >
          <SettingsOutlined />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            {moduleTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {moduleDescription}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2.5}>
        {sections.map((section) => (
          <Box
            key={section.id}
            sx={{
              borderRadius: 2.5,
              border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1.75,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.03),
              }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                {section.title}
              </Typography>
              {section.description && (
                <Typography variant="caption" color="text.secondary">
                  {section.description}
                </Typography>
              )}
            </Box>
            <Box sx={{ p: 2.5 }}>{section.children}</Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
