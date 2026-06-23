
import * as React from 'react';
import MuiAvatar from '@mui/material/Avatar';
import { styled } from '@mui/material/styles';
import { useUser } from '@/lib/auth/client';
import { Box, Stack, Typography } from '@mui/material';
import { DepartureBoard, Groups } from '@mui/icons-material';

const Avatar = styled(MuiAvatar)(({ theme }) => ({
  width: 28,
  height: 28,
  backgroundColor: (theme.vars || theme).palette.background.paper,
  color: (theme.vars || theme).palette.text.secondary,
  border: `1px solid ${(theme.vars || theme).palette.divider}`,
}));

export default function SelectContent() {
  const {user}=useUser()
  return (
    <Stack
        direction="row"
        sx={{
          gap: 1,
          alignItems: 'center',
        }}
      >
        <Avatar variant='square'><Groups/></Avatar>
        <Box sx={{ mr: 'auto' }}>
          <Typography variant="h6" sx={{ fontWeight: 500, lineHeight: '16px' }}>
            {user?.publicMetadata?.dep as string}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Department
          </Typography>
        </Box>
      </Stack>
  );
}
