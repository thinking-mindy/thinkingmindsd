"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/auth/client";
import UpgradePrompt from "./UpgradePrompt";
import { CircularProgress, Box } from "@mui/material";
import { hasModuleAccess } from "@/lib/plan-access-bridge";
import type { ModulePath } from "@/lib/plan-modules";

interface PlanGateProps {
  modulePath: string;
  moduleName: string;
  children: React.ReactNode;
}

export default function PlanGate({ modulePath, moduleName, children }: PlanGateProps) {
  const { user, isLoaded } = useUser();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [planName, setPlanName] = useState<string>("Free");
  const [licenseExpired, setLicenseExpired] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    const companyId = user?.publicMetadata?.companyId as string | undefined;
    if (!companyId) {
      setHasAccess(false);
      return;
    }

    let cancelled = false;

    async function checkAccess() {
      const result = await hasModuleAccess(modulePath as ModulePath);
      if (cancelled) return;
      setHasAccess(result.hasAccess);
      if (result.planName) {
        setPlanName(result.planName);
      }
      setLicenseExpired(Boolean(result.licenseExpired));
    }

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [modulePath, isLoaded, user?.publicMetadata?.companyId]);

  if (!isLoaded || hasAccess === null) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!hasAccess) {
    return (
      <UpgradePrompt
        moduleName={moduleName}
        currentPlan={planName}
        trialExpired={licenseExpired}
      />
    );
  }

  return <>{children}</>;
}

