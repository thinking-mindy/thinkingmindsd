'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/lib/auth/client';
import { usePathname } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Collapse, Typography } from '@mui/material';
import { WorkspacePremium } from '@mui/icons-material';
import { getLicenseStatusForCurrentUserBridge } from '@/lib/desktop/licensing-bridge';
import {
  isPathAllowedWhenLicenseExpired,
  shouldShowRemainingDaysAlert,
  type LicenseStatus,
} from '@/lib/license-utils';
import { openLicenseRenewal } from '@/lib/license-renewal';
import { moduleLabel, pathToModule } from '@/lib/access-control';
import UpgradePrompt from '@/components/UpgradePrompt';

export function LicenseAlertBanner({ status }: { status: LicenseStatus }) {
  const [dismissed, setDismissed] = useState(false);

  if (status.daysRemaining <= 0 || status.daysRemaining > 10) return null;

  return (
    <Collapse in={!dismissed}>
      <Alert
        severity={status.daysRemaining <= 3 ? 'warning' : 'info'}
        icon={<WorkspacePremium />}
        onClose={() => setDismissed(true)}
        action={
          <Button color="inherit" size="small" variant="outlined" onClick={openLicenseRenewal}>
            Renew licence
          </Button>
        }
        sx={{ mb: 2 }}
      >
        <Typography variant="body2">
          {status.daysRemaining === 1
            ? 'Your trial expires tomorrow. Subscribe to keep full access.'
            : `Your trial expires in ${status.daysRemaining} days. Subscribe to keep full access.`}
        </Typography>
      </Alert>
    </Collapse>
  );
}

export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const companyId = user?.publicMetadata?.companyId as string | undefined;

    if (!companyId) {
      setLoading(false);
      return;
    }

    getLicenseStatusForCurrentUserBridge().then((s) => {
      if (cancelled) return;
      setStatus(s ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.publicMetadata?.companyId]);

  const showBanner = status && shouldShowRemainingDaysAlert(status);
  const path = pathname ?? '';

  if (loading && user?.publicMetadata?.companyId) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, width: '100%' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (status?.isExpired && !isPathAllowedWhenLicenseExpired(path)) {
    const mod = pathToModule(path);
    const label = mod ? moduleLabel(mod) : 'This module';
    return (
      <>
        {showBanner && <LicenseAlertBanner status={status} />}
        <UpgradePrompt
          moduleName={label}
          currentPlan={status.isInTrial ? 'Free Trial' : status.planSlug}
          trialExpired
        />
      </>
    );
  }

  return (
    <>
      {showBanner && <LicenseAlertBanner status={status} />}
      {children}
    </>
  );
}
