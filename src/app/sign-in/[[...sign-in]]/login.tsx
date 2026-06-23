"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { styled, alpha, keyframes } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Image from "next/image";
import LoginForm from "@/components/LoginForm";
import MuiLink from "@mui/material/Link";
import NextLink from "next/link";

const drift = keyframes`
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.55; }
  50% { transform: translateY(-12px) scale(1.02); opacity: 0.75; }
`;

const shimmer = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

/** Warm off-white — distinct from pure white form panel */
const BRAND_SURFACE = "#f2f5f4";
const BRAND_SURFACE_DEEP = "#e8eeec";

const SignInRoot = styled(Box)(({ theme }) => ({
  minHeight: "100dvh",
  width: "100%",
  display: "grid",
  gridTemplateColumns: "1fr",
  backgroundColor: theme.palette.background.paper,
  [theme.breakpoints.up("md")]: {
    gridTemplateColumns: "minmax(340px, 42%) 1fr",
  },
}));

const BrandPanel = styled(Box)(({ theme }) => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  padding: theme.spacing(4, 3, 5),
  overflow: "hidden",
  minHeight: 220,
  backgroundColor: BRAND_SURFACE,
  [theme.breakpoints.up("sm")]: {
    minHeight: 280,
    padding: theme.spacing(5, 4, 6),
  },
  [theme.breakpoints.up("md")]: {
    minHeight: "100dvh",
    padding: theme.spacing(6, 5, 7),
    justifyContent: "space-between",
    borderRight: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
  },
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    backgroundImage: "url(/minds-bg.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity: 0.07,
    transform: "scale(1.04)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    inset: 0,
    background: `linear-gradient(
      155deg,
      ${alpha("#ffffff", 0.92)} 0%,
      ${alpha(BRAND_SURFACE, 0.4)} 40%,
      ${alpha(BRAND_SURFACE_DEEP, 0.55)} 100%
    )`,
  },
}));

const BrandOrb = styled(Box)(({ theme }) => ({
  position: "absolute",
  borderRadius: "50%",
  filter: "blur(72px)",
  pointerEvents: "none",
  animation: `${drift} 10s ease-in-out infinite`,
  "&.orb-a": {
    width: 280,
    height: 280,
    top: "-5%",
    right: "-15%",
    background: alpha(theme.palette.primary.main, 0.1),
    animationDelay: "0s",
  },
  "&.orb-b": {
    width: 200,
    height: 200,
    bottom: "10%",
    left: "-12%",
    background: alpha(theme.palette.primary.light, 0.14),
    animationDelay: "-4s",
  },
}));

const FormPanel = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(3, 2.5, 4),
  backgroundColor: theme.palette.background.paper,
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4, 4, 5),
  },
  [theme.breakpoints.up("md")]: {
    padding: theme.spacing(6, 6, 7),
  },
}));

const FormShell = styled(Box)(({ theme }) => ({
  width: "100%",
  maxWidth: 480,
  padding: theme.spacing(3, 2.5),
  borderRadius: theme.spacing(3),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
    borderRadius: theme.spacing(3.5),
    border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
    backgroundColor: theme.palette.background.paper,
    boxShadow: `0 16px 48px ${alpha(theme.palette.common.black, 0.05)}`,
  },
  [theme.breakpoints.up("md")]: {
    maxWidth: 440,
    padding: theme.spacing(4.5, 4),
    boxShadow: "none",
    border: "none",
    backgroundColor: "transparent",
  },
}));

const AccentLine = styled(Box)(({ theme }) => ({
  height: 3,
  width: 48,
  borderRadius: 99,
  marginTop: theme.spacing(2),
  background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
  backgroundSize: "200% 200%",
  animation: `${shimmer} 6s ease infinite`,
}));

const FeaturePill = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(0.75, 1.5),
  borderRadius: 99,
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: theme.palette.primary.dark,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
  backgroundColor: alpha("#ffffff", 0.65),
}));

export default function SignInPage() {
  const isDesktop = useMediaQuery("(min-width:900px)");

  return (
    <SignInRoot>
      <BrandPanel>
        <BrandOrb className="orb-a" />
        <BrandOrb className="orb-b" />

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Box
            sx={{
              width: { xs: "clamp(180px, 55vw, 240px)", md: "clamp(200px, 18vw, 280px)" },
              filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.06))",
            }}
          >
            <Image
              src="/favicon-slimbg.png"
              alt="Thinking Minds"
              width={280}
              height={75}
              priority
              style={{ width: "100%", height: "auto" }}
            />
          </Box>
          {!isDesktop && (
            <Typography
              variant="body2"
              sx={{
                mt: 1.5,
                fontStyle: "italic",
                color: "text.secondary",
                letterSpacing: "0.02em",
              }}
            >
              …thinking in terms of lifetimes.
            </Typography>
          )}
        </Box>

        {isDesktop && (
          <Stack spacing={3} sx={{ position: "relative", zIndex: 1, maxWidth: 360 }}>
            <Box>
              <Typography
                variant="overline"
                color="primary"
                sx={{ letterSpacing: "0.14em", fontWeight: 700, opacity: 0.85 }}
              >
                Desktop ERP
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  mt: 0.5,
                  fontWeight: 700,
                  color: "text.primary",
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                Your business,
                <br />
                one calm workspace.
              </Typography>
              <AccentLine />
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 2.5, lineHeight: 1.65, fontStyle: "italic" }}
              >
                …thinking in terms of lifetimes.
              </Typography>
            </Box>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <FeaturePill>Offline-ready</FeaturePill>
              <FeaturePill>Secure local data</FeaturePill>
              <FeaturePill>POS · Finance · HR</FeaturePill>
            </Stack>
          </Stack>
        )}
      </BrandPanel>

      <FormPanel>
        <FormShell>
          <Box sx={{ mb: { xs: 2, sm: 3 } }}>
            <Typography
              variant="overline"
              color="primary"
              sx={{ fontWeight: 700, letterSpacing: "0.12em" }}
            >
              Sign in
            </Typography>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ mt: 0.5, letterSpacing: "-0.02em", lineHeight: 1.25 }}
            >
              Pick up where you left off
            </Typography>
          </Box>

          <LoginForm initialMode="login" />

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 3 }}>
            Need help?{" "}
            <MuiLink component={NextLink} href="/docs" underline="hover" fontWeight={600}>
              Visit the docs
            </MuiLink>
          </Typography>
        </FormShell>
      </FormPanel>
    </SignInRoot>
  );
}
