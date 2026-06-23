"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isNavItemActive, type NavSectionWithIcons } from "@/lib/nav-menu";
import { isExternalUrl, openExternalUrl } from "@/lib/license-renewal";

export type MenuItemWithIcon = {
  title: string;
  path: string;
  icon: React.ReactNode;
};

export type { NavSectionWithIcons as MenuSectionWithIcons } from "@/lib/nav-menu";

const DEFAULT_OPEN = new Set(["home", "sales", "finance", "supply"]);

function NavGroup({
  section,
  pathname,
  search,
  onNavigate,
}: {
  section: NavSectionWithIcons;
  pathname: string;
  search: string;
  onNavigate: (path: string) => void;
}) {
  const theme = useTheme();
  const hasActive = section.items.some((item) => isNavItemActive(item.path, pathname, search));
  const [open, setOpen] = useState(DEFAULT_OPEN.has(section.id) || hasActive);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  if (section.items.length === 0) return null;

  return (
    <Box sx={{ mb: 0.5 }}>
      <ListItemButton
        onClick={() => setOpen((v) => !v)}
        sx={{
          py: 0.75,
          px: 1.5,
          mx: 1,
          borderRadius: 2,
          minHeight: 36,
          "&:hover": { bgcolor: alpha(theme.palette.action.hover, 0.04) },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            flex: 1,
            fontWeight: 700,
            fontSize: "0.68rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: hasActive ? "primary.main" : "text.secondary",
          }}
        >
          {section.title}
        </Typography>
        <Typography
          component="span"
          variant="caption"
          sx={{
            mr: 0.5,
            px: 0.75,
            py: 0.15,
            borderRadius: 1,
            fontSize: "0.65rem",
            fontWeight: 700,
            bgcolor: alpha(theme.palette.text.primary, 0.06),
            color: "text.secondary",
          }}
        >
          {section.items.length}
        </Typography>
        <ExpandMoreRounded
          sx={{
            fontSize: 18,
            color: "text.secondary",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.22s ease",
          }}
        />
      </ListItemButton>

      <Collapse in={open} timeout={220}>
        <List dense disablePadding sx={{ py: 0.25 }}>
          {section.items.map((item) => {
            const selected = isNavItemActive(item.path, pathname, search);
            return (
              <ListItem key={item.path} disablePadding sx={{ display: "block", px: 1 }}>
                <ListItemButton
                  selected={selected}
                  onClick={() => onNavigate(item.path)}
                  sx={{
                    py: 0.85,
                    px: 1.25,
                    borderRadius: 2.5,
                    mb: 0.25,
                    gap: 1.25,
                    transition: "background-color 0.18s ease, transform 0.18s ease",
                    "&.Mui-selected": {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.14) },
                    },
                    "&:hover": {
                      bgcolor: selected
                        ? alpha(theme.palette.primary.main, 0.14)
                        : alpha(theme.palette.action.hover, 0.06),
                      transform: "translateX(2px)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: 0,
                      width: 34,
                      height: 34,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: selected
                        ? alpha(theme.palette.primary.main, 0.15)
                        : alpha(theme.palette.text.primary, 0.05),
                      color: selected ? "primary.main" : "text.secondary",
                      transition: "all 0.18s ease",
                      "& .MuiSvgIcon-root": { fontSize: 18 },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{
                      fontSize: "0.875rem",
                      fontWeight: selected ? 600 : 500,
                      color: selected ? "primary.main" : "text.primary",
                      noWrap: true,
                    }}
                  />
                  {selected && (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Collapse>
    </Box>
  );
}

export default function MenuContent({
  sections,
}: {
  sections: NavSectionWithIcons[];
  planSlug?: string;
}) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const router = useRouter();

  const visibleSections = useMemo(
    () => sections.filter((s) => s.items.length > 0),
    [sections]
  );

  const handleNavigate = (path: string) => {
    if (isExternalUrl(path)) {
      openExternalUrl(path);
      return;
    }
    router.push(path);
  };

  return (
    <Stack sx={{ flexGrow: 1, py: 1, px: 0.5 }}>
      {visibleSections.map((section) => (
        <NavGroup
          key={section.id}
          section={section}
          pathname={pathname}
          search={search}
          onNavigate={handleNavigate}
        />
      ))}
    </Stack>
  );
}
