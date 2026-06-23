"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Box, Button, Card, CardContent, Stack, Typography, alpha } from "@mui/material";
import LockOutlined from "@mui/icons-material/LockOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import Link from "next/link";
import { moduleLabel, pathToModule } from "@/lib/access-control";
import { useAccessControl } from "@/hooks/useAccessControl";

function AccessDenied({ moduleKey }: { moduleKey: string | null }) {
  const { canAccess } = useAccessControl();
  const label = moduleKey ? moduleLabel(moduleKey) : "this page";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "50vh",
        width: "100%",
        py: 6,
      }}
    >
      <Card
        elevation={0}
        sx={(theme) => ({
          maxWidth: 440,
          width: "100%",
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
          background: `linear-gradient(145deg, ${alpha(theme.palette.error.main, 0.04)} 0%, ${theme.palette.background.paper} 60%)`,
        })}
      >
        <CardContent sx={{ p: 4, textAlign: "center" }}>
          <Box
            sx={(theme) => ({
              width: 56,
              height: 56,
              borderRadius: 2,
              mx: "auto",
              mb: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(theme.palette.error.main, 0.1),
              color: "error.main",
            })}
          >
            <LockOutlined />
          </Box>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Not allowed
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You don&apos;t have permission to open <strong>{label}</strong>. Ask your organisation owner to assign
            module access in the Administration panel.
          </Typography>
          {canAccess("/dashboard") && (
            <Button
              component={Link}
              href="/dashboard"
              variant="contained"
              startIcon={<HomeOutlined />}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Go to dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default function ModuleAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isReady, canAccess } = useAccessControl();

  const allowed = useMemo(() => canAccess(pathname), [canAccess, pathname]);
  const blockedModule = useMemo(() => pathToModule(pathname), [pathname]);

  if (!isLoaded && !isReady) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: "40vh", width: "100%" }}>
        <Typography variant="body2" color="text.secondary">
          Checking access…
        </Typography>
      </Stack>
    );
  }

  if (!allowed) {
    return <AccessDenied moduleKey={blockedModule} />;
  }

  return <>{children}</>;
}
