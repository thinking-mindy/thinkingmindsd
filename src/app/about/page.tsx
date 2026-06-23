"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  Grid,
  Stack,
  alpha,
  styled,
  useTheme,
} from "@mui/material";
import {
  Security,
  Speed,
  Analytics,
  CloudQueue,
  People,
  Business,
  TrendingUp,
  VerifiedUser,
} from "@mui/icons-material";

const FeatureCard = styled(Card)(({ theme }) => ({
  borderRadius: 24,
  padding: theme.spacing(4),
  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.85)} 100%)`,
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.08)}`,
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  height: '100%',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.25)}`,
    borderColor: alpha(theme.palette.primary.main, 0.4),
    '&::before': {
      opacity: 1,
    },
    '& .feature-icon': {
      transform: 'scale(1.1) rotate(5deg)',
    },
  },
}));

const HeroCard = styled(Card)(({ theme }) => ({
  borderRadius: 32,
  padding: theme.spacing(6),
  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
  color: theme.palette.primary.contrastText,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: `0 25px 60px ${alpha(theme.palette.primary.main, 0.3)}`,
  '&::after': {
    content: '""',
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${alpha('#fff', 0.1)}, transparent)`,
    pointerEvents: 'none',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${alpha('#fff', 0.08)}, transparent)`,
    pointerEvents: 'none',
  },
}));

const features = [
  {
    icon: <Security sx={{ fontSize: 48 }} />,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with end-to-end encryption and compliance standards.',
    color: '#667eea',
  },
  {
    icon: <Speed sx={{ fontSize: 48 }} />,
    title: 'Lightning Fast',
    description: 'Optimized performance with real-time updates and instant data synchronization.',
    color: '#4facfe',
  },
  {
    icon: <Analytics sx={{ fontSize: 48 }} />,
    title: 'Advanced Analytics',
    description: 'Powerful insights and reporting tools to make data-driven decisions.',
    color: '#81c784',
  },
  {
    icon: <CloudQueue sx={{ fontSize: 48 }} />,
    title: 'Cloud-Based',
    description: 'Access your data anywhere, anytime with our secure cloud infrastructure.',
    color: '#ff9800',
  },
  {
    icon: <People sx={{ fontSize: 48 }} />,
    title: 'Team Collaboration',
    description: 'Seamless collaboration tools to keep your team connected and productive.',
    color: '#9c27b0',
  },
  {
    icon: <Business sx={{ fontSize: 48 }} />,
    title: 'All-in-One Solution',
    description: 'Complete ERP system covering HR, Finance, Procurement, Inventory, and more.',
    color: '#00bcd4',
  },
];

const stats = [
  { label: 'Modules', value: '10+', icon: <TrendingUp /> },
  { label: 'Security', value: '99.9%', icon: <VerifiedUser /> },
  { label: 'Uptime', value: '99.9%', icon: <CloudQueue /> },
];

export default function AboutPage() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark'
          ? `radial-gradient(circle at 0% 0%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%), ${theme.palette.background.default}`
          : `radial-gradient(circle at 0% 0%, ${alpha(theme.palette.primary.light, 0.15)} 0%, transparent 50%), ${theme.palette.background.default}`,
        py: { xs: 4, md: 8 },
      }}
    >
      <Container maxWidth="lg">
        {/* Hero Section */}
        <HeroCard sx={{ mb: 6, position: 'relative', zIndex: 1 }}>
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                mb: 2,
                background: `linear-gradient(135deg, ${alpha('#fff', 0.95)}, ${alpha('#fff', 0.8)})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Thinking Minds ERP
            </Typography>
            <Typography
              variant="h5"
              sx={{
                opacity: 0.95,
                maxWidth: 700,
                fontWeight: 500,
              }}
            >
              A comprehensive, secure, and reliable Enterprise Resource Planning solution
              designed to streamline your business operations.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                opacity: 0.9,
                maxWidth: 600,
                lineHeight: 1.8,
              }}
            >
              Transform your business with our all-in-one ERP platform that integrates
              HR, Finance, Procurement, Inventory Management, and more into a single,
              powerful system.
            </Typography>
          </Stack>
        </HeroCard>

        {/* Stats Section */}
        <Grid container spacing={3} sx={{ mb: 8 }}>
          {stats.map((stat, index) => (
            <Grid key={index} size={{ xs: 12, sm: 4 }}>
              <Card
                sx={{
                  p: 3,
                  borderRadius: 3,
                  textAlign: 'center',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.dark, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
                  },
                }}
              >
                <Box
                  sx={{
                    color: 'primary.main',
                    mb: 1,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  {stat.icon}
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {stat.label}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Features Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              textAlign: 'center',
              mb: 1,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Why Choose Thinking Minds?
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ textAlign: 'center', mb: 6, maxWidth: 600, mx: 'auto' }}
          >
            Discover the powerful features that make Thinking Minds the perfect ERP solution
            for your business.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard>
                <Stack spacing={2} alignItems="flex-start">
                  <Box
                    className="feature-icon"
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      background: `linear-gradient(135deg, ${alpha(feature.color, 0.15)} 0%, ${alpha(feature.color, 0.25)} 100%)`,
                      color: feature.color,
                      transition: 'transform 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {feature.description}
                  </Typography>
                </Stack>
              </FeatureCard>
            </Grid>
          ))}
        </Grid>

        {/* Mission Statement */}
        <Card
          sx={{
            mt: 8,
            p: { xs: 4, md: 6 },
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.dark, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Our Mission
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                maxWidth: 800,
                lineHeight: 1.8,
                fontSize: '1.1rem',
              }}
            >
              At Thinking Minds, we're committed to providing businesses with a powerful,
              intuitive, and secure ERP solution that simplifies complex operations and
              drives growth. Our platform is designed to scale with your business, offering
              the flexibility and features you need to succeed in today's competitive market.
            </Typography>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
}
