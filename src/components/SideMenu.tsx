"use client";

import * as React from "react";
import { useMemo } from "react";
import { styled, alpha, Box, Chip, Stack, Typography } from "@mui/material";
import MuiDrawer, { drawerClasses } from "@mui/material/Drawer";
import { useTheme } from "@mui/material/styles";
import MenuContent from "./MenuContent";
import { attachIconsToSections } from "@/lib/attach-nav-icons";
import type { NavSection } from "@/lib/nav-menu";
import { NAV_ICON_MAP } from "@/lib/nav-icons";
import CardAlert from "./CardAlert";
import UserAvatarMenu from "./UserAvatarMenu";
import Image from "next/image";
import WorkspacePremiumOutlined from "@mui/icons-material/WorkspacePremiumOutlined";

const drawerWidth = 268;

const Drawer = styled(MuiDrawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  boxSizing: "border-box",
  [`& .${drawerClasses.paper}`]: {
    width: drawerWidth,
    boxSizing: "border-box",
    bgcolor: "background.paper",
    borderRight: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
}));

export default function SideMenu({
  sections,
  planSlug = "free",
  planBadge,
}: {
  sections: NavSection[];
  planSlug?: string;
  planBadge?: string;
}) {
  const theme = useTheme();
  const sectionsWithIcons = useMemo(
    () => attachIconsToSections(sections, NAV_ICON_MAP),
    [sections]
  );

  return (
    <Drawer
      variant="permanent"
      sx={{ display: { xs: "none", md: "block" } }}
    >
      <Box
        sx={{
          px: 2,
          pt: 2.5,
          pb: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.45)}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Image
            src="/logo.png"
            alt="Thinking Minds"
            width={44}
            height={44}
            style={{ borderRadius: 10, objectFit: "contain" }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} noWrap>
              Thinking Minds
            </Typography>
            <Chip
              size="small"
              icon={<WorkspacePremiumOutlined sx={{ fontSize: "14px !important" }} />}
              label={planBadge ?? (planSlug === "free" ? "Free trial" : planSlug)}
              variant="outlined"
              color={planBadge === "Trial expired" ? "error" : planSlug === "free" ? "success" : "default"}
              sx={{
                mt: 0.5,
                height: 22,
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "capitalize",
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Box
        sx={{
          overflow: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: alpha(theme.palette.text.primary, 0.12),
            borderRadius: 4,
          },
        }}
      >
        <MenuContent sections={sectionsWithIcons} planSlug={planSlug} />
        <Box sx={{ px: 1, pb: 1.25, mt: "auto" }}>
          <CardAlert />
        </Box>
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.45)}`,
          bgcolor: alpha(theme.palette.background.default, 0.4),
        }}
      >
        <UserAvatarMenu variant="sidebar" />
      </Box>
    </Drawer>
  );
}
