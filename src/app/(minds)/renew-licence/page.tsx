"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import {
  Business,
  CheckCircle,
  CloudSync,
  PhoneAndroid,
  Search,
  Store,
  Storefront,
  WorkspacePremium,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/client";
import {
  getLicenseRenewalOptionsBridge,
  initiateLicenseRenewalPaymentBridge,
  peekLicenseRenewalOrgBridge,
  pollLicenseRenewalStatusBridge,
  registerLicenseRenewalOrgBridge,
} from "@/lib/desktop/license-renewal-bridge";
import { syncLicenseFromServerBridge } from "@/lib/desktop/licensing-bridge";
import type {
  LicenseRenewalOption,
  LicenseRenewalOrgPreview,
  LicenseRenewalPeekMatch,
} from "@/lib/license-renewal-types";
import { openExternalUrl } from "@/lib/license-renewal";
import { LICENSE_RENEWAL_EXTERNAL_URL } from "@/lib/app-config";

const STEPS = ["Find organization", "Review & plan", "Pay with PayNow", "Complete"] as const;
const ORG_ID_RE = /^[a-f0-9]{24}$/i;
const BRAND = "#047857";

const TIER_ICONS: Record<string, React.ReactNode> = {
  vendor: <Storefront />,
  shopkeeper: <Store />,
  company: <Business />,
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function buildOrgPreview(
  peek: Record<string, unknown>,
  licenseType: string,
  options: LicenseRenewalOption[]
): LicenseRenewalOrgPreview {
  const tier =
    options.find((o) => o.id === licenseType) ??
    options.find((o) => o.billingTier === peek.billingTier) ??
    options[0];
  return {
    orgId: String(peek.orgId ?? ""),
    orgName: String(peek.orgName ?? ""),
    licenseExpiresAt: typeof peek.licenseExpiresAt === "string" ? peek.licenseExpiresAt : undefined,
    planSlug: typeof peek.planSlug === "string" ? peek.planSlug : tier?.planSlug,
    billingStatus: typeof peek.billingStatus === "string" ? peek.billingStatus : undefined,
    billingTier: typeof peek.billingTier === "string" ? peek.billingTier : tier?.billingTier,
    licenseType,
    licenseTypeLabel: tier?.label ?? licenseType,
    amount: tier?.priceMonthly ?? Number(peek.amount ?? 0),
    months: typeof peek.months === "number" ? peek.months : 1,
    planLabel: typeof peek.planLabel === "string" ? peek.planLabel : tier?.planSlug,
    created: peek.created === true,
  };
}

export default function RenewLicencePage() {
  const router = useRouter();
  const { user } = useUser();
  const companyId = user?.publicMetadata?.companyId as string | undefined;
  const companyName =
    (user?.publicMetadata?.companyName as string | undefined) ||
    user?.fullName ||
    "";

  const [step, setStep] = useState(0);
  const [options, setOptions] = useState<LicenseRenewalOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<LicenseRenewalPeekMatch[]>([]);
  const [needsRegister, setNeedsRegister] = useState(false);
  const [registerOrgId, setRegisterOrgId] = useState("");
  const [registerOrgName, setRegisterOrgName] = useState("");

  const [org, setOrg] = useState<LicenseRenewalOrgPreview | null>(null);
  const [licenseType, setLicenseType] = useState("company");

  const [phone, setPhone] = useState("263");
  const [contactName, setContactName] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "initiating" | "polling" | "paid" | "failed">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [renewalId, setRenewalId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncedExpiry, setSyncedExpiry] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getLicenseRenewalOptionsBridge().then((res) => {
      if (res.success && res.data?.length) {
        setOptions(res.data);
        setLicenseType(res.data.find((o) => o.id === "company")?.id ?? res.data[0].id);
      }
      setLoadingOptions(false);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const phoneValid = useMemo(() => /^2637\d{8}$/.test(phone.replace(/\s+/g, "")), [phone]);

  const applyPeekSuccess = useCallback(
    (data: Record<string, unknown>) => {
      if (data.success === false) {
        setError(String(data.message ?? "Lookup failed"));
        if (data.ambiguous && Array.isArray(data.matches)) {
          setMatches(data.matches as LicenseRenewalPeekMatch[]);
        }
        return;
      }
      if (data.exists === false) {
        setNeedsRegister(true);
        setMatches([]);
        if (data.lookupBy === "name") {
          setRegisterOrgName(String(data.query ?? query));
          setRegisterOrgId("");
        } else {
          setRegisterOrgId(String(data.query ?? query));
          setRegisterOrgName("");
        }
        setStep(1);
        return;
      }
      const type =
        (typeof data.licenseType === "string" && data.licenseType) ||
        (typeof data.billingTier === "string" && data.billingTier === "shop_owner"
          ? "shopkeeper"
          : typeof data.billingTier === "string"
            ? data.billingTier
            : "company");
      setLicenseType(type);
      setOrg(buildOrgPreview(data, type, options));
      setNeedsRegister(false);
      setStep(1);
    },
    [options, query]
  );

  const handleLookup = async (lookupQuery?: string) => {
    const q = (lookupQuery ?? query).trim();
    if (!q) {
      setError("Enter your organization name or id from Admin → Plan & Usage.");
      return;
    }
    setBusy(true);
    setError("");
    setMatches([]);
    try {
      const res = await peekLicenseRenewalOrgBridge(q);
      if (!res.success) {
        setError(res.error ?? "Lookup failed");
        return;
      }
      applyPeekSuccess(res.data as Record<string, unknown>);
    } finally {
      setBusy(false);
    }
  };

  const handleUseMyOrg = () => {
    if (!companyId) return;
    setQuery(companyId);
    void handleLookup(companyId);
  };

  const handleRegister = async () => {
    const id = registerOrgId.trim();
    const name = registerOrgName.trim();
    if (!ORG_ID_RE.test(id)) {
      setError("Enter your 24-character organization id from Admin → Plan & Usage.");
      return;
    }
    if (!name) {
      setError("Enter a business or organization name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await registerLicenseRenewalOrgBridge({
        orgId: id,
        licenseType,
        orgName: name,
      });
      if (!res.success) {
        setError(res.error ?? "Registration failed");
        return;
      }
      const data = res.data as Record<string, unknown>;
      if (data.success === false) {
        setError(String(data.message ?? "Registration failed"));
        return;
      }
      setOrg(
        buildOrgPreview(
          { orgId: id, orgName: name, ...data },
          licenseType,
          options
        )
      );
      setNeedsRegister(false);
    } finally {
      setBusy(false);
    }
  };

  const handleContinueToPay = () => {
    if (!org) {
      setError("Complete organization setup first.");
      return;
    }
    setStep(2);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const syncLicenceLocally = async () => {
    setSyncing(true);
    try {
      const result = await syncLicenseFromServerBridge();
      if (result.success && result.data?.licenseExpiresAt) {
        setSyncedExpiry(result.data.licenseExpiresAt);
      }
    } finally {
      setSyncing(false);
    }
  };

  const pollPayment = useCallback(
    async (id: string) => {
      const res = await pollLicenseRenewalStatusBridge(id);
      if (!res.success) {
        setPaymentStatus("failed");
        setPaymentMessage(res.error ?? "Could not verify payment");
        stopPolling();
        return;
      }
      const data = res.data;
      if (data.paid === true || data.status === "paid") {
        stopPolling();
        setPaymentStatus("paid");
        setPaymentMessage("Payment successful — syncing licence…");
        await syncLicenceLocally();
        setStep(3);
        return;
      }
      if (data.status === "failed" || data.status === "cancelled") {
        stopPolling();
        setPaymentStatus("failed");
        setPaymentMessage(data.message ?? "Payment was not completed.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handlePay = async () => {
    if (!org) return;
    if (!phoneValid) {
      setError("Enter a valid EcoCash number (2637XXXXXXXX).");
      return;
    }
    setBusy(true);
    setError("");
    setPaymentStatus("initiating");
    setPaymentMessage("Sending PayNow request to your phone…");
    try {
      const res = await initiateLicenseRenewalPaymentBridge({
        orgId: org.orgId,
        licenseType,
        phoneNumber: phone.replace(/\s+/g, ""),
        contactName: contactName.trim() || org.orgName,
      });
      if (!res.success) {
        setPaymentStatus("failed");
        setPaymentMessage(res.error ?? "Could not start payment");
        return;
      }
      const data = res.data;
      if (!data.success || !data.renewalId) {
        setPaymentStatus("failed");
        setPaymentMessage(data.message ?? "Could not start PayNow payment.");
        return;
      }
      setRenewalId(data.renewalId);
      setPaymentReference(data.reference ?? "");
      setPaymentMessage(
        data.instructions ?? data.message ?? "Check your phone for the PayNow prompt."
      );
      setPaymentStatus("polling");
      stopPolling();
      pollRef.current = setInterval(() => {
        void pollPayment(data.renewalId!);
      }, 3000);
      void pollPayment(data.renewalId);
    } finally {
      setBusy(false);
    }
  };

  const selectedTier = options.find((o) => o.id === licenseType);

  return (
    <Box sx={{ maxWidth: 880, mx: "auto", py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.12em" }}>
            Billing
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
            Renew ERP licence
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Look up your organization, choose a plan, and pay via PayNow. Your licence is updated on
            this device after payment.
          </Typography>
        </Box>

        <Stepper activeStep={step} alternativeLabel sx={{ display: { xs: "none", sm: "flex" } }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {loadingOptions && <LinearProgress />}

        {step === 0 && (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Search color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Find your organization
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Search by name or paste the org id from Admin → Plan & Usage. Name search is
                  case-insensitive.
                </Typography>
                {companyId && (
                  <Button
                    variant="outlined"
                    startIcon={<WorkspacePremium />}
                    onClick={handleUseMyOrg}
                    disabled={busy}
                    sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 600 }}
                  >
                    Use my organization{companyName ? ` (${companyName})` : ""}
                  </Button>
                )}
                <TextField
                  label="Organization name or id"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  fullWidth
                  onKeyDown={(e) => e.key === "Enter" && void handleLookup()}
                />
                {matches.length > 0 && (
                  <List dense disablePadding sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
                    {matches.map((m) => (
                      <ListItemButton key={m.orgId} onClick={() => void handleLookup(m.orgId)}>
                        <ListItemText
                          primary={m.orgName}
                          secondary={m.orgId}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                )}
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => void handleLookup()}
                  disabled={busy || !query.trim()}
                  endIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
                  sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700, bgcolor: BRAND }}
                >
                  Look up organization
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Stack spacing={2.5}>
            {needsRegister ? (
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Register organization
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Organization id (24-character hex)"
                      value={registerOrgId}
                      onChange={(e) => setRegisterOrgId(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Organization name"
                      value={registerOrgName}
                      onChange={(e) => setRegisterOrgName(e.target.value)}
                      fullWidth
                    />
                    <PlanPicker
                      options={options}
                      licenseType={licenseType}
                      onSelect={setLicenseType}
                    />
                    <Button
                      variant="contained"
                      onClick={() => void handleRegister()}
                      disabled={busy}
                      sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700, bgcolor: BRAND }}
                    >
                      Register & continue
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ) : org ? (
              <>
                <Alert severity="info" icon={<Business />}>
                  <strong>{org.orgName}</strong> · Org id: {org.orgId}
                  {org.licenseExpiresAt && (
                    <>
                      {" "}
                      · Current expiry: {formatDate(org.licenseExpiresAt)}
                    </>
                  )}
                </Alert>
                <Typography variant="subtitle1" fontWeight={800}>
                  Choose renewal plan
                </Typography>
                <PlanPicker options={options} licenseType={licenseType} onSelect={setLicenseType} />
                <Stack direction="row" spacing={1.5}>
                  <Button onClick={() => setStep(0)} sx={{ textTransform: "none" }}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleContinueToPay}
                    sx={{ textTransform: "none", fontWeight: 700, bgcolor: BRAND }}
                  >
                    Continue to payment · ${selectedTier?.priceMonthly ?? org.amount}/mo
                  </Button>
                </Stack>
              </>
            ) : null}
          </Stack>
        )}

        {step === 2 && org && (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <PhoneAndroid color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Pay with PayNow
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Paying for <strong>{org.orgName}</strong> · {selectedTier?.label ?? org.licenseTypeLabel}{" "}
                  · <strong>${selectedTier?.priceMonthly ?? org.amount}</strong>/month
                </Typography>
                {paymentMessage && (
                  <Alert
                    severity={
                      paymentStatus === "failed"
                        ? "error"
                        : paymentStatus === "paid"
                          ? "success"
                          : "info"
                    }
                  >
                    {paymentMessage}
                    {paymentReference && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        Reference: {paymentReference}
                      </Typography>
                    )}
                  </Alert>
                )}
                <TextField
                  label="EcoCash / mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="2637XXXXXXXX"
                  fullWidth
                  disabled={paymentStatus === "polling" || paymentStatus === "initiating"}
                />
                <TextField
                  label="Contact name (optional)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  fullWidth
                  disabled={paymentStatus === "polling" || paymentStatus === "initiating"}
                />
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Button onClick={() => setStep(1)} sx={{ textTransform: "none" }}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => void handlePay()}
                    disabled={busy || !phoneValid || paymentStatus === "polling"}
                    sx={{ textTransform: "none", fontWeight: 700, bgcolor: BRAND }}
                  >
                    {paymentStatus === "polling" ? "Waiting for payment…" : "Pay with PayNow"}
                  </Button>
                  {renewalId && paymentStatus === "polling" && (
                    <Button
                      variant="outlined"
                      onClick={() => void pollPayment(renewalId)}
                      sx={{ textTransform: "none" }}
                    >
                      Check payment status
                    </Button>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Stay on this page until payment is confirmed.{" "}
                  <Button
                    size="small"
                    sx={{ textTransform: "none", p: 0, minWidth: 0, verticalAlign: "baseline" }}
                    onClick={() => openExternalUrl(LICENSE_RENEWAL_EXTERNAL_URL)}
                  >
                    Open web renewal page
                  </Button>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card
            variant="outlined"
            sx={{
              borderRadius: 3,
              borderColor: alpha(BRAND, 0.4),
              bgcolor: alpha(BRAND, 0.04),
            }}
          >
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <CheckCircle sx={{ fontSize: 56, color: BRAND, mb: 2 }} />
              <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
                Licence renewed
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {syncedExpiry
                  ? `Your licence is active until ${formatDate(syncedExpiry)}.`
                  : "Payment received. Sync your licence if the expiry date has not updated yet."}
              </Typography>
              <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap">
                <Button
                  variant="contained"
                  onClick={() => router.push("/dashboard")}
                  sx={{ textTransform: "none", fontWeight: 700, bgcolor: BRAND }}
                >
                  Go to dashboard
                </Button>
                <Button
                  variant="outlined"
                  startIcon={syncing ? <CircularProgress size={16} /> : <CloudSync />}
                  onClick={() => void syncLicenceLocally()}
                  disabled={syncing}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Sync licence again
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}

function PlanPicker({
  options,
  licenseType,
  onSelect,
}: {
  options: LicenseRenewalOption[];
  licenseType: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Grid container spacing={2}>
      {options.map((opt) => {
        const selected = licenseType === opt.id;
        return (
          <Grid key={opt.id} size={{ xs: 12, md: 4 }}>
            <Card
              variant="outlined"
              onClick={() => onSelect(opt.id)}
              sx={{
                cursor: "pointer",
                borderRadius: 2.5,
                borderWidth: 2,
                borderColor: selected ? opt.accent : "divider",
                bgcolor: selected ? alpha(opt.accent, 0.06) : "background.paper",
                transition: "border-color 0.2s ease, transform 0.2s ease",
                "&:hover": { transform: "translateY(-2px)" },
              }}
            >
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ color: opt.accent }}>{TIER_ICONS[opt.id] ?? <WorkspacePremium />}</Box>
                    {selected && <Chip label="Selected" size="small" sx={{ fontWeight: 700 }} />}
                  </Stack>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {opt.label}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: opt.accent }}>
                    ${opt.priceMonthly}
                    <Typography component="span" variant="body2" color="text.secondary">
                      /mo
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {opt.summary}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
