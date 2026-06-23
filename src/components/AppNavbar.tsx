"use client";

import * as React from "react";
import {
  styled,
  AppBar,
  Box,
  Stack,
  Toolbar as MuiToolbar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  alpha,
  useTheme,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import { LICENSE_RENEWAL_URL } from "@/lib/app-config";
import Image from "next/image";
import Link from "next/link";
import SideMenuMobile from "./SideMenuMobile";
import UserAvatarMenu from "./UserAvatarMenu";
import { attachIconsToSections } from "@/lib/attach-nav-icons";
import type { NavSection } from "@/lib/nav-menu";
import { NAV_ICON_MAP } from "@/lib/nav-icons";

const Toolbar = styled(MuiToolbar)(({ theme }) => ({
  width: "100%",
  minHeight: 56,
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(1),
}));

function getMenuPaperSx(theme: { palette: { divider: string; mode: string } }) {
  return {
    minWidth: 280,
    borderRadius: 3,
    mt: 1.5,
    overflow: "hidden" as const,
    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
    boxShadow: theme.palette.mode === "dark"
      ? "0 12px 40px rgba(0,0,0,0.4)"
      : "0 12px 40px rgba(0,0,0,0.12)",
  };
}

function getMenuHeaderSx(theme: { palette: { primary: { main: string } } }) {
  return {
    px: 2,
    py: 2,
    bgcolor: alpha(theme.palette.primary.main, 0.04),
    borderBottom: "1px solid",
    borderColor: "divider",
  };
}

function getNavIconButtonSx(theme: { palette: { primary: { main: string }; text: { secondary: string } } }) {
  return {
    color: theme.palette.text.secondary,
    borderRadius: 2,
    "&:hover": {
      bgcolor: alpha(theme.palette.primary.main, 0.08),
      color: theme.palette.primary.main,
    },
    transition: "background-color 0.2s ease, color 0.2s ease",
  };
}

function getMenuItemSx(theme: { palette: { primary: { main: string } } }) {
  return {
    borderRadius: 1.5,
    mx: 1,
    mt: 0.25,
    py: 1.25,
    "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
    "&:last-of-type": { mb: 0.5 },
  };
}

interface AppNavbarProps {
  sections?: NavSection[];
  planSlug?: string;
  planBadge?: string;
}

export default function AppNavbar({
  sections = [],
  planSlug = "free",
  planBadge,
}: AppNavbarProps = {}) {
  const theme = useTheme();
  const sectionsWithIcons = React.useMemo(
    () => attachIconsToSections(sections, NAV_ICON_MAP),
    [sections]
  );
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [notifAnchor, setNotifAnchor] = React.useState<null | HTMLElement>(null);
  const [helpAnchor, setHelpAnchor] = React.useState<null | HTMLElement>(null);
  const [planAnchor, setPlanAnchor] = React.useState<null | HTMLElement>(null);

  const toggleDrawer = (newOpen: boolean) => () => setDrawerOpen(newOpen);
  const iconBtnSx = getNavIconButtonSx(theme);
  const itemSx = getMenuItemSx(theme);
  const headerSx = getMenuHeaderSx(theme);
  const paperSx = getMenuPaperSx(theme);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        display: { xs: "block", md: "none" },
        bgcolor: "#ffffff",
        borderBottom: "1px solid",
        borderColor: "#dbe1ea",
        top: "var(--template-frame-height, 0px)",
      }}
    >
      <Toolbar disableGutters>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          <CustomIcon />
        </Stack>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton
            size="small"
            aria-label="Notifications"
            onClick={(e) => setNotifAnchor(e.currentTarget)}
            sx={iconBtnSx}
          >
            <NotificationsNoneOutlinedIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={notifAnchor}
            open={Boolean(notifAnchor)}
            onClose={() => setNotifAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: paperSx } }}
          >
            <Box sx={headerSx}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                    color: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <NotificationsNoneOutlinedIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Notifications
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Alerts and updates
                  </Typography>
                </Box>
              </Stack>
            </Box>
            <Box sx={{ py: 1 }}>
              <MenuItem component={Link} href="/notifications" onClick={() => setNotifAnchor(null)} sx={itemSx}>
                <ListItemIcon sx={{ minWidth: 40, color: "primary.main" }}>
                  <NotificationsNoneOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="View all" secondary="No new notifications" primaryTypographyProps={{ fontWeight: 500 }} />
              </MenuItem>
            </Box>
          </Menu>

          <IconButton size="small" aria-label="Help" onClick={(e) => setHelpAnchor(e.currentTarget)} sx={iconBtnSx}>
            <HelpOutlineOutlinedIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={helpAnchor}
            open={Boolean(helpAnchor)}
            onClose={() => setHelpAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: paperSx } }}
          >
            <Box sx={headerSx}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                    color: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <HelpOutlineOutlinedIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Help & Support
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Guides and helpdesk
                  </Typography>
                </Box>
              </Stack>
            </Box>
            <Box sx={{ py: 1 }}>
              <MenuItem component={Link} href="/help" onClick={() => setHelpAnchor(null)} sx={itemSx}>
                <ListItemIcon sx={{ minWidth: 40, color: "primary.main" }}>
                  <HelpOutlineOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Help center" primaryTypographyProps={{ fontWeight: 500 }} />
              </MenuItem>
              <MenuItem component={Link} href="/helpdesk" onClick={() => setHelpAnchor(null)} sx={itemSx}>
                <ListItemIcon sx={{ minWidth: 40, color: "primary.main" }}>
                  <OpenInNewOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Helpdesk tickets" primaryTypographyProps={{ fontWeight: 500 }} />
              </MenuItem>
            </Box>
          </Menu>

          <IconButton size="small" aria-label="Subscription" onClick={(e) => setPlanAnchor(e.currentTarget)} sx={iconBtnSx}>
            <WorkspacePremiumOutlinedIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={planAnchor}
            open={Boolean(planAnchor)}
            onClose={() => setPlanAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: paperSx } }}
          >
            <Box sx={headerSx}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                    color: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <WorkspacePremiumOutlinedIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Subscription
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Plan & billing
                  </Typography>
                </Box>
              </Stack>
            </Box>
            <Box sx={{ py: 1 }}>
              <MenuItem component={Link} href="/admin?tab=plan" onClick={() => setPlanAnchor(null)} sx={itemSx}>
                <ListItemIcon sx={{ minWidth: 40, color: "primary.main" }}>
                  <CreditCardOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Current plan"
                  secondary={planBadge ?? (planSlug === "free" ? "Free trial" : planSlug)}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </MenuItem>
              <MenuItem
                component={Link}
                href={LICENSE_RENEWAL_URL}
                onClick={() => setPlanAnchor(null)}
                sx={itemSx}
              >
                <ListItemIcon sx={{ minWidth: 40, color: "primary.main" }}>
                  <WorkspacePremiumOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Renew licence"
                  secondary="Pay & sync locally"
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </MenuItem>
            </Box>
          </Menu>

          <UserAvatarMenu size={34} />

          <IconButton size="small" aria-label="Menu" onClick={toggleDrawer(true)} sx={iconBtnSx}>
            <MenuRoundedIcon />
          </IconButton>
        </Stack>

        <SideMenuMobile
          open={drawerOpen}
          toggleDrawer={toggleDrawer}
          sections={sectionsWithIcons}
          planSlug={planSlug}
          planBadge={planBadge}
        />
      </Toolbar>
    </AppBar>
  );
}

export function CustomIcon() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Image src="/logo.png" alt="Thinking Minds" width={40} height={40} />
    </Box>
  );
}
