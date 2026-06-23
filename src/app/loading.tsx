'use client';

import { Box, Typography, alpha, useTheme } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

export default function Loading() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: theme.palette.background.default,
        px: 2,
      }}
    >
      <Box
        sx={{
          p: 4,
          borderRadius: 3,
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          boxShadow: `0 12px 40px ${alpha(theme.palette.common.black, 0.06)}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 200,
        }}
      >
        <CircularProgress
          size={40}
          thickness={3.2}
          sx={{
            color: theme.palette.primary.main,
            mb: 2,
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            letterSpacing: '0.02em',
          }}
        >
          Loading
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontWeight: 500,
            mt: 0.25,
          }}
        >
          Preparing your workspace
        </Typography>
      </Box>
    </Box>
  );
}
