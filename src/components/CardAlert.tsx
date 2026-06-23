"use client";
import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { PlayCircleOutlineRounded, ArrowForward } from '@mui/icons-material';
import { Box, Stack, alpha, styled } from '@mui/material';
import { useRouter } from 'next/navigation';

const StyledCard = styled(Card)(({ theme }) => ({
  flexShrink: 0,
  borderRadius: 10,
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)}, ${alpha(theme.palette.primary.main, 0.06)})`,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
  boxShadow: 'none',
}));

export default function CardAlert() {
  const router = useRouter();

  return (
    <StyledCard>
      <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box
            sx={(theme) => ({
              width: 28,
              height: 28,
              borderRadius: 1,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            })}
          >
            <PlayCircleOutlineRounded sx={{ fontSize: 16 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" fontWeight={700} display="block" lineHeight={1.3}>
              Watch tutorials
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', lineHeight: 1.35, mt: 0.25, fontSize: '0.68rem' }}
            >
              Step-by-step module guides
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => router.push('/docs')}
              endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
              sx={{
                mt: 0.75,
                py: 0.25,
                px: 1,
                minHeight: 26,
                fontSize: '0.68rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 1,
                boxShadow: 'none',
              }}
            >
              Open docs
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </StyledCard>
  );
}
