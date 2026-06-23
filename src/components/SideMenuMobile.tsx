import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import MenuButton from "./MenuButton";
import MenuContent, { type MenuSectionWithIcons } from "./MenuContent";
import CardAlert from "./CardAlert";
import { useUser } from "@/lib/auth/client";

interface SideMenuMobileProps {
  open: boolean | undefined;
  toggleDrawer: (newOpen: boolean) => () => void;
  sections?: MenuSectionWithIcons[];
  planSlug?: string;
  planBadge?: string;
}

export default function SideMenuMobile({
  open,
  toggleDrawer,
  sections = [],
  planSlug = "free",
  planBadge: _planBadge,
}: SideMenuMobileProps) {
  const { user } = useUser();

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={toggleDrawer(false)}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        [`& .${drawerClasses.paper}`]: {
          backgroundImage: "none",
          backgroundColor: "background.paper",
        },
      }}
    >
      <Stack sx={{ maxWidth: "85dvw", width: 300, height: "100%" }}>
        <Stack direction="row" sx={{ p: 2, pb: 1, gap: 1, alignItems: "center" }}>
          <Avatar
            alt={user?.firstName ?? "User"}
            src={user?.imageUrl}
            sx={{ width: 32, height: 32 }}
          />
          <Typography component="p" variant="subtitle1" fontWeight={700} noWrap sx={{ flex: 1 }}>
            {user?.fullName}
          </Typography>
          <MenuButton showBadge>
            <NotificationsRoundedIcon />
          </MenuButton>
        </Stack>
        <Divider />
        <Stack sx={{ flexGrow: 1, overflow: "auto" }}>
          <MenuContent sections={sections} planSlug={planSlug} />
        </Stack>
        <Divider />
        <Box sx={{ p: 1 }}>
          <CardAlert />
        </Box>
        <Stack sx={{ p: 2 }}>
          <Button variant="outlined" fullWidth startIcon={<LogoutRoundedIcon />}>
            Logout
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
