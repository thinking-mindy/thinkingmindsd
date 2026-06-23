"use client";

import * as React from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  ListSubheader,
  Divider,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from "@mui/material";
import type { PopoverOrigin } from "@mui/material/Popover";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Theme } from "@mui/material/styles";
import { useAccessControl } from "@/hooks/useAccessControl";
import { openLicenseRenewal } from "@/lib/license-renewal";
import {
  MINDS_MENU_CORE,
  MINDS_MENU_FINANCE_EXT,
  MINDS_MENU_OPERATIONS,
  MINDS_MENU_SYSTEM,
  type MindMenuItem,
} from "@/lib/minds-menu-data";
import { MindMenuPathIcon } from "@/lib/minds-menu-path-icons";
import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import ViewModuleOutlined from "@mui/icons-material/ViewModuleOutlined";
import HubOutlined from "@mui/icons-material/HubOutlined";
import SavingsOutlined from "@mui/icons-material/SavingsOutlined";
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import HelpOutlineOutlined from "@mui/icons-material/HelpOutlineOutlined";
import AppsOutlined from "@mui/icons-material/AppsOutlined";
import BarChartOutlined from "@mui/icons-material/BarChartOutlined";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import SwitchAccountOutlined from "@mui/icons-material/SwitchAccountOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import SupportAgentOutlined from "@mui/icons-material/SupportAgentOutlined";
import KeyboardArrowDownOutlined from "@mui/icons-material/KeyboardArrowDownOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import AddCircleOutlineOutlined from "@mui/icons-material/AddCircleOutlineOutlined";
import DataUsageOutlined from "@mui/icons-material/DataUsageOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import PlaylistAddOutlined from "@mui/icons-material/PlaylistAddOutlined";
import NoteAddOutlined from "@mui/icons-material/NoteAddOutlined";
import ViewCompactOutlined from "@mui/icons-material/ViewCompactOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import NotificationsNoneOutlined from "@mui/icons-material/NotificationsNoneOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import CreditCardOutlined from "@mui/icons-material/CreditCardOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";

const menuIconColor = "primary" as const;

type MenubarDropdownProps = {
  label: string;
  startIcon: React.ReactNode;
  anchorOrigin: PopoverOrigin;
  transformOrigin: PopoverOrigin;
  /** Extra sx merged into Menu paper */
  paperSx?: object;
  mlAuto?: boolean;
  children: React.ReactNode;
};

function MenubarDropdown({
  label,
  startIcon,
  anchorOrigin,
  transformOrigin,
  paperSx = {},
  mlAuto,
  children,
}: MenubarDropdownProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const closeNow = React.useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl((prev) => (prev ? null : event.currentTarget));
  };

  const topBtnSx = React.useMemo(
    () => ({
      minWidth: "auto" as const,
      px: 1.25,
      py: 0.5,
      fontSize: "0.8125rem",
      fontWeight: 600,
      textTransform: "none" as const,
      color: "text.primary",
      borderRadius: 0.75,
      "& .MuiButton-startIcon": { mr: 0.5, ml: -0.25 },
      "& .MuiButton-endIcon": { ml: 0.15, mr: -0.35 },
      "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08) },
    }),
    [theme]
  );

  return (
    <Box
      sx={{
        display: "inline-flex",
        position: "relative",
        verticalAlign: "middle",
        overflow: "visible",
        ...(mlAuto ? { ml: "auto" } : {}),
      }}
    >
      <Button
        size="small"
        startIcon={startIcon}
        onClick={handleButtonClick}
        endIcon={
          <KeyboardArrowDownOutlined
            sx={{
              fontSize: 18,
              transition: theme.transitions.create("transform", { duration: 180 }),
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              opacity: open ? 1 : 0.65,
            }}
          />
        }
        aria-haspopup="true"
        aria-expanded={open}
        tabIndex={0}
        sx={topBtnSx}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeNow}
        disableScrollLock
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        slotProps={{
          paper: {
            sx: {
              minWidth: 240,
              borderRadius: 1.5,
              mt: 0.25,
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              overflow: "hidden",
              ...paperSx,
            },
          },
          list: { sx: { py: 0 } },
        }}
      >
        {React.Children.toArray(children)}
      </Menu>
    </Box>
  );
}

// Alias for older JSX/snippets; same component as MenubarDropdown.
const HoverMenubarDropdown = MenubarDropdown;

type BarMenuProps = {
  label: string;
  labelIcon: React.ReactNode;
  items: MindMenuItem[];
  allow: (path: string) => boolean;
  hideAdmin?: boolean;
};

function filterItems(items: MindMenuItem[], allow: (p: string) => boolean, hideAdmin?: boolean) {
  return items.filter((i) => {
    if (hideAdmin && (i.path === "/admin" || i.path.startsWith("/admin"))) return false;
    return allow(i.path);
  });
}

function clusterByGroup(items: MindMenuItem[]): { groupLabel: string; items: MindMenuItem[] }[] {
  const order: string[] = [];
  const buckets = new Map<string, MindMenuItem[]>();
  for (const item of items) {
    const key = item.group?.trim() || "More";
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(item);
  }
  return order.map((groupLabel) => ({ groupLabel, items: buckets.get(groupLabel)! }));
}

function menuSubheaderSx(theme: Theme) {
  return {
    position: "relative" as const,
    lineHeight: 1.4,
    fontWeight: 800,
    fontSize: "0.65rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: theme.palette.text.secondary,
    bgcolor: alpha(theme.palette.primary.main, 0.07),
    py: 0.85,
    px: 1.75,
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
  };
}

function BarMenu({ label, labelIcon, items, allow, hideAdmin }: BarMenuProps) {
  const theme = useTheme();
  const visible = filterItems(items, allow, hideAdmin);
  const clusters = React.useMemo(() => clusterByGroup(visible), [visible]);
  if (visible.length === 0) return null;

  return (
    <MenubarDropdown
      label={label}
      startIcon={labelIcon}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      paperSx={{ minWidth: 268 }}
    >
      {clusters.flatMap((cluster, ci) => {
        const dividerSx = {
          borderColor: alpha(theme.palette.primary.main, 0.15),
          "&::before, &::after": { borderColor: alpha(theme.palette.divider, 0.9) },
        };
        return [
          ...(ci > 0
            ? [
                <Divider
                  key={`bar-div-${cluster.groupLabel}`}
                  sx={dividerSx}
                />,
              ]
            : []),
          <ListSubheader
            key={`bar-sub-${cluster.groupLabel}`}
            disableSticky
            disableGutters
            sx={menuSubheaderSx(theme)}
          >
            {cluster.groupLabel}
          </ListSubheader>,
          ...cluster.items.map((item) => (
            <MenuItem
              key={item.path + item.title}
              component={Link}
              href={item.path}
              dense
              sx={{ py: 0.85, px: 1.5, gap: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <MindMenuPathIcon path={item.path} fontSize="small" color={menuIconColor} />
              </ListItemIcon>
              <ListItemText primary={item.title} primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
            </MenuItem>
          )),
        ];
      })}
    </MenubarDropdown>
  );
}

export default function DesktopModuleMenubar() {
  const theme = useTheme();
  const router = useRouter();
  const { canAccess, isOwner } = useAccessControl();

  const allow = React.useCallback((path: string) => canAccess(path), [canAccess]);

  const hideAdmin = !isOwner;

  const openNewWindow = () => {
    if (typeof window !== "undefined") {
      window.open("/", "_blank", "noopener,noreferrer");
    }
  };

  const quickActionSx = {
    width: 30,
    height: 30,
    borderRadius: 1.5,
    color: "text.secondary",
    "&:hover": {
      bgcolor: alpha(theme.palette.primary.main, 0.1),
      color: "primary.main",
    },
  } as const;

  return (
    <Box
      component="nav"
      aria-label="Module menu bar"
      sx={{
        display: { xs: "none", md: "flex" },
        width: "100%",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 0.25,
        minHeight: 40,
        px: 1.5,
        py: 0.25,
        overflow: "visible",
        position: "sticky",
        top: 0,
        zIndex: (t) => t.zIndex.appBar - 2,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? alpha(t.palette.background.paper, 0.96)
            : alpha(t.palette.grey[100], 0.92),
        backdropFilter: "blur(14px) saturate(1.2)",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          mr: 1,
          px: 1,
          py: 0.25,
          fontWeight: 800,
          letterSpacing: "0.04em",
          color: "primary.main",
          borderRight: 1,
          borderColor: "divider",
          display: { md: "inline-flex" },
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <AppsOutlined sx={{ fontSize: 18, color: "primary.main" }} aria-hidden />
        ERP
      </Typography>

      <MenubarDropdown
        label="Home"
        startIcon={<HomeOutlined fontSize="small" color={menuIconColor} />}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <ListSubheader disableSticky disableGutters sx={menuSubheaderSx(theme)}>
          Workspace
        </ListSubheader>
        <MenuItem component={Link} href="/dashboard" dense sx={{ py: 0.85, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <MindMenuPathIcon path="/" fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Dashboard home" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
        <MenuItem component={Link} href="/tasks" dense sx={{ py: 0.85, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <TaskAltOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="My tasks" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
      </MenubarDropdown>

      <MenubarDropdown
        label="Create"
        startIcon={<AddCircleOutlineOutlined fontSize="small" color={menuIconColor} />}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <ListSubheader disableSticky disableGutters sx={menuSubheaderSx(theme)}>
          Quick create
        </ListSubheader>
        <MenuItem component={Link} href="/inventory/products" dense sx={{ py: 0.85, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <PlaylistAddOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="New inventory item" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
        <MenuItem component={Link} href="/procurement" dense sx={{ py: 0.85, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <NoteAddOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="New purchase order" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
      </MenubarDropdown>

      <MenubarDropdown
        label="Data"
        startIcon={<DataUsageOutlined fontSize="small" color={menuIconColor} />}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <ListSubheader disableSticky disableGutters sx={menuSubheaderSx(theme)}>
          Data tools
        </ListSubheader>
        <MenuItem component={Link} href="/settings" dense sx={{ py: 0.85, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <SettingsOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Offline settings" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
        <MenuItem component={Link} href="/reports" dense sx={{ py: 0.85, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <BarChartOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Reports & analytics" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
      </MenubarDropdown>

      <MenubarDropdown
        label="View"
        startIcon={<VisibilityOutlined fontSize="small" color={menuIconColor} />}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <ListSubheader disableSticky disableGutters sx={menuSubheaderSx(theme)}>
          View options
        </ListSubheader>
        <MenuItem dense sx={{ py: 0.85, px: 1.5 }} onClick={() => router.push("/dashboard")}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <ViewCompactOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Compact dashboard" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
        <MenuItem dense sx={{ py: 0.85, px: 1.5 }} onClick={() => router.push("/docs")}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <SearchOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Search docs" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
      </MenubarDropdown>

      <MenubarDropdown
        label="File"
        startIcon={<FolderOpenOutlined fontSize="small" color={menuIconColor} />}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <ListSubheader disableSticky disableGutters sx={menuSubheaderSx(theme)}>
          Open
        </ListSubheader>
        <MenuItem component={Link} href="/dashboard" dense sx={{ py: 0.85, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <MindMenuPathIcon path="/" fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Home / Dashboard" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
        <MenuItem component={Link} href="/reports" dense sx={{ py: 0.85, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <BarChartOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Reports & export" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
        <Divider sx={{ borderColor: alpha(theme.palette.primary.main, 0.15) }} />
        <ListSubheader disableSticky disableGutters sx={menuSubheaderSx(theme)}>
          Session
        </ListSubheader>
        <MenuItem
          dense
          sx={{ py: 0.85, px: 1.5 }}
          onClick={() => {
            router.refresh();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <RefreshOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Refresh data" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
        <MenuItem component={Link} href="/sign-in" dense sx={{ py: 0.85, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <SwitchAccountOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Switch account" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
      </MenubarDropdown>

      <BarMenu
        label="Core"
        labelIcon={<ViewModuleOutlined fontSize="small" color={menuIconColor} />}
        items={MINDS_MENU_CORE}
        allow={allow}
        hideAdmin={hideAdmin}
      />
      <BarMenu
        label="Operations"
        labelIcon={<HubOutlined fontSize="small" color={menuIconColor} />}
        items={MINDS_MENU_OPERATIONS}
        allow={allow}
        hideAdmin={hideAdmin}
      />
      <BarMenu
        label="Finance & tools"
        labelIcon={<SavingsOutlined fontSize="small" color={menuIconColor} />}
        items={MINDS_MENU_FINANCE_EXT}
        allow={allow}
        hideAdmin={hideAdmin}
      />
      <BarMenu
        label="System"
        labelIcon={<AdminPanelSettingsOutlined fontSize="small" color={menuIconColor} />}
        items={MINDS_MENU_SYSTEM}
        allow={allow}
        hideAdmin={hideAdmin}
      />

      <MenubarDropdown
        label="Window"
        startIcon={<OpenInNewOutlined fontSize="small" color={menuIconColor} />}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <ListSubheader disableSticky disableGutters sx={menuSubheaderSx(theme)}>
          Window
        </ListSubheader>
        <MenuItem
          dense
          sx={{ py: 0.85, px: 1.5 }}
          onClick={() => {
            openNewWindow();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <OpenInNewOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="New window" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
        <MenuItem
          dense
          sx={{ py: 0.85, px: 1.5 }}
          onClick={() => {
            router.push("/dashboard");
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <MindMenuPathIcon path="/" fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Go to dashboard" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
      </MenubarDropdown>

      <MenubarDropdown
        label="Help"
        startIcon={<HelpOutlineOutlined fontSize="small" color={menuIconColor} />}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        mlAuto
      >
        <ListSubheader disableSticky disableGutters sx={menuSubheaderSx(theme)}>
          Help resources
        </ListSubheader>
        <MenuItem component={Link} href="/docs" dense sx={{ py: 0.85, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <MenuBookOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Documentation" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
        <MenuItem component={Link} href="/helpdesk" dense sx={{ py: 0.85, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <SupportAgentOutlined fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Helpdesk" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
        <Divider sx={{ borderColor: alpha(theme.palette.primary.main, 0.15) }} />
        <ListSubheader disableSticky disableGutters sx={menuSubheaderSx(theme)}>
          Account
        </ListSubheader>
        <MenuItem dense sx={{ py: 0.85, px: 1.5 }} onClick={openLicenseRenewal}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <MindMenuPathIcon path="/admin?tab=plan" fontSize="small" color={menuIconColor} />
          </ListItemIcon>
          <ListItemText primary="Renew licence" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
      </MenubarDropdown>

      <Stack direction="row" spacing={0.25} alignItems="center" sx={{ ml: 0.75 }}>
        <Tooltip title="Tasks">
          <IconButton size="small" sx={quickActionSx} onClick={() => router.push("/tasks")}>
            <TaskAltOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Notifications">
          <IconButton size="small" sx={quickActionSx} onClick={() => router.push("/notifications")}>
            <NotificationsNoneOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Renew licence">
          <IconButton size="small" sx={quickActionSx} onClick={openLicenseRenewal}>
            <CreditCardOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Settings">
          <IconButton size="small" sx={quickActionSx} onClick={() => router.push("/settings")}>
            <SettingsOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
