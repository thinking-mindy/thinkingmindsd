"use client";

import React from "react";
import {
  Box,
  Button,
  Card,
  Container,
  Typography,
  Stack,
  alpha,
  styled,
  useTheme,
} from "@mui/material";
import {
  SearchOff,
  Home,
  ArrowBack,
  Explore,
  QuestionMark,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import AppTheme from "@/shared-theme/AppTheme";
import ColorModeSelect from "@/shared-theme/ColorModeSelect";
import CssBaseline from "@mui/material/CssBaseline";

const NotFoundCard = styled(Card)(({ theme }) => ({
  borderRadius: 32,
  padding: theme.spacing(6),
  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.85)} 100%)`,
  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
  boxShadow: `0 20px 60px ${alpha(theme.palette.warning.main, 0.15)}`,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
  },
}));

const IconContainer = styled(Box)(({ theme }) => ({
  width: 140,
  height: 140,
  borderRadius: '50%',
  background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.15)} 0%, ${alpha(theme.palette.warning.dark, 0.25)} 100%)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  animation: 'float 3s ease-in-out infinite',
  '@keyframes float': {
    '0%, 100%': {
      transform: 'translateY(0px)',
    },
    '50%': {
      transform: 'translateY(-20px)',
    },
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: -15,
    borderRadius: '50%',
    border: `3px solid ${alpha(theme.palette.warning.main, 0.2)}`,
    animation: 'ripple 3s ease-out infinite',
    '@keyframes ripple': {
      '0%': {
        transform: 'scale(0.8)',
        opacity: 1,
      },
      '100%': {
        transform: 'scale(1.3)',
        opacity: 0,
      },
    },
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: -25,
    borderRadius: '50%',
    border: `2px solid ${alpha(theme.palette.warning.main, 0.1)}`,
    animation: 'ripple 3s ease-out infinite 0.5s',
  },
}));

const Number404 = styled(Typography)(({ theme }) => ({
  fontSize: '8rem',
  fontWeight: 900,
  lineHeight: 1,
  background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  fontFamily: 'Inter, sans-serif',
  letterSpacing: '-0.05em',
  position: 'relative',
  '&::after': {
    content: '"404"',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.dark, 0.1)} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    filter: 'blur(20px)',
    zIndex: -1,
  },
}));

export default function NotFoundPage() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <AppTheme>
      <CssBaseline enableColorScheme />
      <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1000 }} />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.palette.mode === 'dark'
            ? `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.warning.main, 0.1)} 0%, transparent 50%), ${theme.palette.background.default}`
            : `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.warning.light, 0.15)} 0%, transparent 50%), ${theme.palette.background.default}`,
          py: 4,
          px: 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="md">
          <NotFoundCard>
            <Stack spacing={4} alignItems="center" textAlign="center">
              {/* 404 Number */}
              <Number404>404</Number404>

              {/* Icon */}
              <IconContainer>
                <SearchOff
                  sx={{
                    fontSize: 72,
                    color: 'warning.main',
                  }}
                />
              </IconContainer>

              {/* Message */}
              <Box>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    mb: 2,
                    background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Page Not Found
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    maxWidth: 500,
                    mx: 'auto',
                    lineHeight: 1.8,
                    mb: 1,
                  }}
                >
                  The page you're looking for doesn't exist or has been moved.
                  It might have been deleted, renamed, or the URL might be incorrect.
                </Typography>
              </Box>

              {/* Action Buttons */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ width: '100%', maxWidth: 500 }}
              >
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Home />}
                  onClick={() => router.push('/')}
                  fullWidth
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: '#fff',
                    fontWeight: 600,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.5)}`,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Go to Dashboard
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ArrowBack />}
                  onClick={() => router.back()}
                  fullWidth
                  sx={{
                    borderColor: alpha(theme.palette.warning.main, 0.5),
                    color: 'warning.main',
                    fontWeight: 600,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: theme.palette.warning.main,
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Go Back
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<Explore />}
                  onClick={() => router.push('/')}
                  fullWidth
                  sx={{
                    borderColor: alpha(theme.palette.divider, 0.5),
                    color: 'text.secondary',
                    fontWeight: 600,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: theme.palette.divider,
                      bgcolor: alpha(theme.palette.divider, 0.1),
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Explore
                </Button>
              </Stack>

              {/* Help Text */}
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.warning.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  width: '100%',
                  maxWidth: 500,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    color: 'text.secondary',
                  }}
                >
                  <QuestionMark sx={{ fontSize: 16 }} />
                  Need help? Check the URL or contact support if you believe this is an error.
                </Typography>
              </Box>
            </Stack>
          </NotFoundCard>
        </Container>
      </Box>
    </AppTheme>
  );
}

