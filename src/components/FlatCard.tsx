'use client';

import { Card, alpha, styled } from '@mui/material';

/** Minimal card — no gradients, no colored top bars. */
export const FlatCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
  boxShadow: 'none',
  backgroundColor: theme.palette.background.paper,
}));

export type StatTone = 'safe' | 'warning' | 'danger' | 'neutral';

export function statToneColor(tone: StatTone): string {
  switch (tone) {
    case 'warning':
      return 'warning.main';
    case 'danger':
      return 'error.main';
    case 'safe':
      return 'success.main';
    default:
      return 'text.primary';
  }
}

export function statIconSx(tone: StatTone) {
  return (t: import('@mui/material').Theme) => ({
    width: 40,
    height: 40,
    borderRadius: 1.5,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor:
      tone === 'neutral'
        ? alpha(t.palette.divider, 0.4)
        : alpha(
            t.palette[tone === 'safe' ? 'success' : tone === 'warning' ? 'warning' : 'error'].main,
            0.1
          ),
    color: statToneColor(tone),
  });
}
