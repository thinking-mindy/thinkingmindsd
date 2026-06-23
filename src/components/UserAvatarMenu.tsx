"use client";

import * as React from "react";
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/client";
import { logout as authLogout } from "@/lib/desktop/auth-bridge";
import { LICENSE_RENEWAL_PATH } from "@/lib/app-config";
import { useAccessControl } from "@/hooks/useAccessControl";

function getInitials(name?: string | null, email?: string | null): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  return (email?.[0] ?? "U").toUpperCase();
}

type UserAvatarMenuProps = {
  size?: number;
  showLabel?: boolean;
  /** `sidebar` — full-width drawer footer card; `icon` — compact header avatar. */
  variant?: "icon" | "sidebar";
};

export default function UserAvatarMenu({
  size = 36,
  showLabel = false,
  variant = "icon",
}: UserAvatarMenuProps) {
  const theme = useTheme();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { isOwner } = useAccessControl();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const open = Boolean(anchorEl);
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
  const displayName = user?.fullName || user?.username || "User";
  const imageUrl = user?.imageUrl;
  const initials = getInitials(user?.fullName, email);
  const isSidebar = variant === "sidebar";

  const handleLogout = async () => {
    setLoggingOut(true);
    setAnchorEl(null);
    try {
      await authLogout();
      router.push("/sign-in");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const paperSx = {
    minWidth: isSidebar ? 248 : 260,
    borderRadius: 3,
    mt: isSidebar ? -1 : 1.25,
    mb: isSidebar ? 0.5 : 0,
    overflow: "hidden" as const,
    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 12px 40px rgba(0,0,0,0.4)"
        : "0 12px 40px rgba(0,0,0,0.12)",
  };

  const itemSx = {
    borderRadius: 1.5,
    mx: 1,
    mt: 0.25,
    py: 1.1,
    "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
    "&:last-of-type": { mb: 0.5 },
  };

  const avatarSx = {
    width: isSidebar ? 40 : size,
    height: isSidebar ? 40 : size,
    fontSize: (isSidebar ? 40 : size) * 0.38,
    fontWeight: 700,
    bgcolor: alpha(theme.palette.primary.main, 0.12),
    color: "primary.dark",
  };

  if (!isLoaded) {
    return (
      <Box
        sx={{
          width: isSidebar ? "100%" : size,
          height: isSidebar ? 56 : size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={isSidebar ? 22 : Math.max(18, size - 14)} />
      </Box>
    );
  }

  const menu = (
    <Menu
      id="user-avatar-menu"
      anchorEl={anchorEl}
      open={open}
      onClose={() => setAnchorEl(null)}
      anchorOrigin={{
        vertical: isSidebar ? "top" : "bottom",
        horizontal: isSidebar ? "left" : "right",
      }}
      transformOrigin={{
        vertical: isSidebar ? "bottom" : "top",
        horizontal: isSidebar ? "left" : "right",
      }}
      slotProps={{ paper: { sx: paperSx } }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.75,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar src={imageUrl} sx={{ width: 40, height: 40, fontWeight: 700 }}>
            {!imageUrl ? initials : null}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {email || "Signed in"}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ py: 0.75 }}>
        <MenuItem component={Link} href="/profile" onClick={() => setAnchorEl(null)} sx={itemSx}>
          <ListItemIcon sx={{ minWidth: 36, color: "primary.main" }}>
            <AccountCircleOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="My profile" primaryTypographyProps={{ fontWeight: 600 }} />
        </MenuItem>
        <MenuItem component={Link} href="/settings" onClick={() => setAnchorEl(null)} sx={itemSx}>
          <ListItemIcon sx={{ minWidth: 36, color: "primary.main" }}>
            <SettingsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Settings" primaryTypographyProps={{ fontWeight: 600 }} />
        </MenuItem>
        <MenuItem
          component={Link}
          href={LICENSE_RENEWAL_PATH}
          onClick={() => setAnchorEl(null)}
          sx={itemSx}
        >
          <ListItemIcon sx={{ minWidth: 36, color: "primary.main" }}>
            <WorkspacePremiumOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Renew licence" primaryTypographyProps={{ fontWeight: 600 }} />
        </MenuItem>
      </Box>

      <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.6) }} />

      <Box sx={{ py: 0.75 }}>
        <MenuItem
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          sx={{
            ...itemSx,
            color: "error.main",
            "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.08) },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: "error.main" }}>
            {loggingOut ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <LogoutRoundedIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText primary="Log out" primaryTypographyProps={{ fontWeight: 600 }} />
        </MenuItem>
      </Box>
    </Menu>
  );

  if (isSidebar) {
    return (
      <>
        <Box
          component="button"
          type="button"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Account menu"
          aria-controls={open ? "user-avatar-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            p: 1.25,
            border: `1px solid ${open ? alpha(theme.palette.primary.main, 0.35) : alpha(theme.palette.divider, 0.55)}`,
            borderRadius: 2.5,
            bgcolor: open
              ? alpha(theme.palette.primary.main, 0.08)
              : alpha(theme.palette.background.default, 0.65),
            cursor: "pointer",
            textAlign: "left",
            font: "inherit",
            color: "inherit",
            transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              borderColor: alpha(theme.palette.primary.main, 0.28),
              boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.06)}`,
            },
          }}
        >
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar src={imageUrl} alt={displayName} sx={avatarSx}>
              {!imageUrl ? initials : null}
            </Avatar>
            <Box
              sx={{
                position: "absolute",
                bottom: 1,
                right: 1,
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "success.main",
                border: `2px solid ${theme.palette.background.paper}`,
              }}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.15 }}>
              <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.3 }}>
                {displayName}
              </Typography>
              {isOwner && (
                <Chip
                  label="Owner"
                  size="small"
                  color="primary"
                  sx={{
                    height: 18,
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    "& .MuiChip-label": { px: 0.75 },
                  }}
                />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {email || "Account"}
            </Typography>
          </Box>

          <KeyboardArrowUpRoundedIcon
            sx={{
              fontSize: 20,
              color: "text.secondary",
              flexShrink: 0,
              transform: open ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </Box>
        {menu}
      </>
    );
  }

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ flexShrink: 0, ml: showLabel ? 0 : "auto" }}
      >
        {showLabel && (
          <Box sx={{ textAlign: "right", display: { xs: "none", lg: "block" }, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {email}
            </Typography>
          </Box>
        )}
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Account menu"
          aria-controls={open ? "user-avatar-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          size="small"
          sx={{
            p: 0.25,
            border: `2px solid ${open ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.2)}`,
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              borderColor: theme.palette.primary.main,
              boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.12)}`,
            },
          }}
        >
          <Avatar src={imageUrl} alt={displayName} sx={avatarSx}>
            {!imageUrl ? initials : null}
          </Avatar>
        </IconButton>
      </Stack>
      {menu}
    </>
  );
}
