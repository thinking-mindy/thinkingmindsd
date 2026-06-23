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
  ErrorOutlineOutlined,
  RefreshOutlined,
  HomeOutlined,
  ArrowBackOutlined,
  BugReportOutlined,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import AppTheme from "@/shared-theme/AppTheme";
import ColorModeSelect from "@/shared-theme/ColorModeSelect";
import CssBaseline from "@mui/material/CssBaseline";

const ErrorCard = styled(Card)(({ theme }) => ({
  borderRadius: 24,
  padding: theme.spacing(5),
  background: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
  boxShadow: theme.palette.mode === "dark"
    ? `0 24px 48px ${alpha(theme.palette.common.black, 0.4)}`
    : `0 24px 48px ${alpha(theme.palette.common.black, 0.08)}`,
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: theme.palette.error.main,
    borderRadius: "24px 24px 0 0",
  },
}));

const IconContainer = styled(Box)(({ theme }) => ({
  width: 96,
  height: 96,
  borderRadius: 20,
  background: alpha(theme.palette.error.main, 0.08),
  border: `2px solid ${alpha(theme.palette.error.main, 0.2)}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
}));

interface ErrorPageProps {
  error?: Error & { digest?: string };
  reset?: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <AppTheme>
      <CssBaseline enableColorScheme />
      <ColorModeSelect sx={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 1000 }} />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: theme.palette.background.default,
          py: 4,
          px: 2,
          position: "relative",
        }}
      >
        <Container maxWidth="sm">
          <ErrorCard>
            <Stack spacing={4} alignItems="center" textAlign="center">
              <IconContainer>
                <ErrorOutlineOutlined
                  sx={{ fontSize: 48, color: "error.main" }}
                />
              </IconContainer>

              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    mb: 1.5,
                    color: "text.primary",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Something went wrong
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    maxWidth: 420,
                    mx: "auto",
                    lineHeight: 1.7,
                  }}
                >
                  We hit an unexpected error. You can try again or head back to
                  the dashboard.
                </Typography>
                {error?.message && (
                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.error.main, 0.06),
                      border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                      textAlign: "left",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        color: "error.main",
                        fontWeight: 600,
                      }}
                    >
                      <BugReportOutlined sx={{ fontSize: 16 }} />
                      Error details
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 1,
                        fontFamily: "monospace",
                        color: "text.secondary",
                        wordBreak: "break-word",
                        fontSize: "0.8rem",
                      }}
                    >
                      {error.message}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ width: "100%", maxWidth: 400 }}
              >
                {reset && (
                  <Button
                    variant="contained"
                    size="large"
                    color="error"
                    startIcon={<RefreshOutlined />}
                    onClick={reset}
                    fullWidth
                    sx={{
                      fontWeight: 600,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: "none",
                      boxShadow: (t) =>
                        `0 4px 14px ${alpha(t.palette.error.main, 0.35)}`,
                      "&:hover": {
                        boxShadow: (t) =>
                          `0 6px 20px ${alpha(t.palette.error.main, 0.45)}`,
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    Try again
                  </Button>
                )}
                <Button
                  variant="contained"
                  size="large"
                  color="primary"
                  startIcon={<HomeOutlined />}
                  onClick={() => router.push("/")}
                  fullWidth
                  sx={{
                    fontWeight: 600,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: "none",
                    "&:hover": {
                      boxShadow: (t) =>
                        `0 6px 20px ${alpha(t.palette.primary.main, 0.4)}`,
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ArrowBackOutlined />}
                  onClick={() => router.back()}
                  fullWidth
                  sx={{
                    borderColor: "divider",
                    color: "text.secondary",
                    fontWeight: 600,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "text.secondary",
                      bgcolor: (t) => alpha(t.palette.text.secondary, 0.06),
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  Go back
                </Button>
              </Stack>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ opacity: 0.8 }}
              >
                If this keeps happening, contact support.
              </Typography>
            </Stack>
          </ErrorCard>
        </Container>
      </Box>
    </AppTheme>
  );
}
