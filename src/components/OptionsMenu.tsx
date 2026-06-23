"use client"
import * as React from 'react';
import { styled } from '@mui/material/styles';
import Divider, { dividerClasses } from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MuiMenuItem from '@mui/material/MenuItem';
import { paperClasses } from '@mui/material/Paper';
import { listClasses } from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon, { listItemIconClasses } from '@mui/material/ListItemIcon';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import MenuButton from './MenuButton';
import { useRouter } from 'next/navigation';
import { Backdrop, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { AccountBoxOutlined, Close, SettingsSuggestOutlined } from '@mui/icons-material';
import { logout as authLogout } from '@/lib/desktop/auth-bridge';

const MenuItem = styled(MuiMenuItem)({
  margin: '2px 0',
});

export default function OptionsMenu() {
  const go=useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [openD, setOpenD] = React.useState<boolean>(false);
  const [openB, setOpenB] = React.useState<boolean>(false);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleCloseB = () => {
    setOpenB(false);
  };
  const handleLogout = async () => {
    setOpenB(true);
    try {
      await authLogout();
      go.push('/sign-in');
      go.refresh();
    } finally {
      setOpenB(false);
    }
  };
  return (
    <React.Fragment>
      <MenuButton
        aria-label="Open menu"
        onClick={handleClick}
        sx={{ borderColor: 'transparent' }}
      >
        <MoreVertRoundedIcon />
      </MenuButton>
      <Menu
        anchorEl={anchorEl}
        id="menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{
          [`& .${listClasses.root}`]: {
            padding: '4px',
          },
          [`& .${paperClasses.root}`]: {
            padding: 0,
          },
          [`& .${dividerClasses.root}`]: {
            margin: '4px -4px',
          },
        }}
      >
        <MenuItem onClick={() => { handleClose(); go.push("/profile"); }}>
          <ListItemIcon>
              <AccountBoxOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>My Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); go.push("/settings"); }}>
          <ListItemIcon>
              <SettingsSuggestOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={handleLogout}
          sx={{
            [`& .${listItemIconClasses.root}`]: {
              ml: 'auto',
              minWidth: 0,
            },
          }}
        >
        <Backdrop
          sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
          open={openB}
          onClick={handleCloseB}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
          <ListItemText>Logout</ListItemText>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
        </MenuItem>
      </Menu>
      <Dialog open={openD} onClose={()=>{setOpenD(false)}} fullWidth maxWidth='md'>
        <DialogTitle textAlign='end'><IconButton onClick={()=>{setOpenD(false)}}><Close/></IconButton></DialogTitle>
      </Dialog>
    </React.Fragment>
  );
}
