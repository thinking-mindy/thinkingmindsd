'use client';

import * as React from 'react';
import {
  Stack,
  IconButton,
  Box,
  Typography,
  Divider,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import { usePathname, useRouter } from 'next/navigation';
import UserAvatarMenu from '@/components/UserAvatarMenu';

type NavHistory = { stack: string[]; index: number };

function useAppNavigation(pathname: string, router: ReturnType<typeof useRouter>) {
  const [history, setHistory] = React.useState<NavHistory>({ stack: [pathname], index: 0 });

  React.useEffect(() => {
    setHistory((prev) => {
      if (prev.stack[prev.index] === pathname) return prev;
      const existingIdx = prev.stack.lastIndexOf(pathname);
      if (existingIdx >= 0 && existingIdx !== prev.index) {
        return { ...prev, index: existingIdx };
      }
      const stack = [...prev.stack.slice(0, prev.index + 1), pathname];
      return { stack, index: stack.length - 1 };
    });
  }, [pathname]);

  const canGoBack = history.index > 0;
  const canGoForward = history.index < history.stack.length - 1;

  const goBack = React.useCallback(() => {
    if (!canGoBack) return;
    const next = history.stack[history.index - 1];
    router.push(next);
  }, [canGoBack, history, router]);

  const goForward = React.useCallback(() => {
    if (!canGoForward) return;
    const next = history.stack[history.index + 1];
    router.push(next);
  }, [canGoForward, history, router]);

  return { canGoBack, canGoForward, goBack, goForward };
}

function formatPathLabel(path: string): string {
  if (!path || path === '/' || path === '/dashboard') return 'Dashboard';
  const parts = path.replace(/^\//, '').split('/').filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Header({ planSlug: _planSlug = 'free' }: { planSlug?: string }) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { canGoBack, canGoForward, goBack, goForward } = useAppNavigation(pathname, router);

  const navControlSx = {
    width: 36,
    height: 36,
    borderRadius: 1.5,
    color: 'text.secondary',
    transition: 'all 0.2s ease',
    '&:hover:not(.Mui-disabled)': {
      bgcolor: alpha(theme.palette.primary.main, 0.1),
      color: 'primary.main',
    },
    '&.Mui-disabled': {
      opacity: 0.35,
    },
  } as const;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        display: { xs: 'none', md: 'flex' },
        width: '100%',
        maxWidth: 1700,
        px: 1.5,
        py: 1,
        borderRadius: 2.5,
        border: '1px solid #dbe1ea',
        bgcolor: '#ffffff',
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        sx={{
          borderRadius: 2.5,
          border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
          bgcolor: alpha(theme.palette.grey[50], 0.9),
          boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.8)}`,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Tooltip title="Back" placement="bottom" arrow>
          <span>
            <IconButton
              size="small"
              aria-label="Go back"
              disabled={!canGoBack}
              onClick={goBack}
              sx={navControlSx}
            >
              <ArrowBackOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ borderColor: alpha(theme.palette.divider, 0.45) }} />
        <Tooltip title="Forward" placement="bottom" arrow>
          <span>
            <IconButton
              size="small"
              aria-label="Go forward"
              disabled={!canGoForward}
              onClick={goForward}
              sx={navControlSx}
            >
              <ArrowForwardOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap>
          {formatPathLabel(pathname)}
        </Typography>
      </Box>

      <UserAvatarMenu size={38} showLabel />
    </Stack>
  );
}
