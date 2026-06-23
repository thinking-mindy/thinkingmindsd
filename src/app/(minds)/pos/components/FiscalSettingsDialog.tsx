"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import VerifiedUserOutlined from "@mui/icons-material/VerifiedUserOutlined";
import {
  closeZimraFiscalDay,
  getZimraFiscalSettings,
  openZimraFiscalDay,
  pingZimraDevice,
  refreshZimraFiscalStatus,
  registerZimraFiscalDevice,
  syncZimraFiscalConfig,
  updateZimraFiscalSettings,
  verifyZimraTaxpayer,
} from "@/lib/desktop/fiscal-bridge";

export default function FiscalSettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [environment, setEnvironment] = useState<"test" | "production">("test");
  const [deviceId, setDeviceId] = useState("");
  const [deviceSerialNo, setDeviceSerialNo] = useState("");
  const [activationKey, setActivationKey] = useState("");
  const [deviceModelName, setDeviceModelName] = useState("ThinkingMindsPOS");
  const [deviceModelVersion, setDeviceModelVersion] = useState("v1");
  const [receiptCurrency, setReceiptCurrency] = useState<"USD" | "ZWG">("USD");
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [certificatePem, setCertificatePem] = useState("");
  const [privateKeyPem, setPrivateKeyPem] = useState("");

  const [fiscalDayStatus, setFiscalDayStatus] = useState<string>("—");
  const [fiscalDayNo, setFiscalDayNo] = useState<number | null>(null);
  const [taxPayerName, setTaxPayerName] = useState<string | undefined>();
  const [hasCertificate, setHasCertificate] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setMessage(null);
    getZimraFiscalSettings()
      .then((res) => {
        if (!res.success || !res.data) return;
        const s = res.data.settings;
        const st = res.data.state;
        if (s) {
          setEnabled(s.enabled);
          setEnvironment(s.environment);
          setDeviceId(String(s.deviceId || ""));
          setDeviceSerialNo(s.deviceSerialNo || "");
          setDeviceModelName(s.deviceModelName || "ThinkingMindsPOS");
          setDeviceModelVersion(s.deviceModelVersion || "v1");
          setReceiptCurrency(s.receiptCurrency || "USD");
          setTaxInclusive(s.taxInclusive ?? true);
          setTaxPayerName(s.taxPayerName);
          setHasCertificate(Boolean(s.hasCertificate));
        }
        if (st) {
          setFiscalDayStatus(st.fiscalDayStatus);
          setFiscalDayNo(st.fiscalDayNo || null);
        }
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await updateZimraFiscalSettings({
      enabled,
      environment,
      deviceId: Number(deviceId) || 0,
      deviceSerialNo,
      activationKey: activationKey || undefined,
      deviceModelName,
      deviceModelVersion,
      receiptCurrency,
      taxInclusive,
      ...(certificatePem.trim() ? { certificatePem: certificatePem.trim() } : {}),
      ...(privateKeyPem.trim() ? { privateKeyPem: privateKeyPem.trim() } : {}),
    });
    setSaving(false);
    if (!res.success) {
      setMessage({ type: "error", text: res.error || "Failed to save" });
      return;
    }
    setMessage({ type: "success", text: "ZIMRA settings saved." });
    setCertificatePem("");
    setPrivateKeyPem("");
  };

  const runAction = async (label: string, fn: () => Promise<{ success: boolean; error?: string; data?: unknown }>) => {
    setSaving(true);
    setMessage(null);
    const res = await fn();
    setSaving(false);
    if (!res.success) {
      setMessage({ type: "error", text: res.error || `${label} failed` });
      return;
    }
    setMessage({ type: "success", text: `${label} succeeded.` });
    if (label === "Sync config" && res.data && typeof res.data === "object") {
      const cfg = res.data as { taxPayerName?: string };
      if (cfg.taxPayerName) setTaxPayerName(cfg.taxPayerName);
    }
    if (
      label === "Refresh status" ||
      label === "Open fiscal day" ||
      label === "Close fiscal day" ||
      label === "Register device"
    ) {
      const statusRes = await getZimraFiscalSettings();
      if (statusRes.success && statusRes.data?.state) {
        setFiscalDayStatus(statusRes.data.state.fiscalDayStatus);
        setFiscalDayNo(statusRes.data.state.fiscalDayNo || null);
      }
      if (statusRes.success && statusRes.data?.settings) {
        setHasCertificate(Boolean(statusRes.data.settings.hasCertificate));
      }
    }
  };

  const handleRegisterDevice = async () => {
    if (!deviceId || !deviceSerialNo || !activationKey) {
      setMessage({ type: "error", text: "Device ID, serial number, and activation key are required." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await registerZimraFiscalDevice({
      environment,
      deviceId: Number(deviceId),
      deviceSerialNo,
      activationKey,
      deviceModelName,
      deviceModelVersion,
    });
    setSaving(false);
    if (!res.success) {
      setMessage({ type: "error", text: res.error || "Registration failed" });
      return;
    }
    setMessage({
      type: "success",
      text: "Device registered with ZIMRA. Certificate and private key saved — enable fiscalisation when ready.",
    });
    setHasCertificate(true);
    setCertificatePem("");
    setPrivateKeyPem("");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <VerifiedUserOutlined color="primary" />
        ZIMRA FDMS Fiscalisation
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {message && <Alert severity={message.type}>{message.text}</Alert>}

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <FormControlLabel
                control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
                label="Enable ZIMRA fiscalisation on POS sales"
              />
              <Chip
                label={`Day: ${fiscalDayNo ?? "—"} · ${fiscalDayStatus}`}
                size="small"
                color={fiscalDayStatus === "FiscalDayOpened" ? "success" : "default"}
              />
              {taxPayerName && (
                <Typography variant="caption" color="text.secondary">
                  {taxPayerName}
                </Typography>
              )}
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as "test" | "production")}
                fullWidth
                size="small"
              >
                <MenuItem value="test">Test (fdmsapitest.zimra.co.zw)</MenuItem>
                <MenuItem value="production">Production</MenuItem>
              </TextField>
              <TextField
                select
                label="Receipt currency"
                value={receiptCurrency}
                onChange={(e) => setReceiptCurrency(e.target.value as "USD" | "ZWG")}
                fullWidth
                size="small"
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="ZWG">ZWG</MenuItem>
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Device ID"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Device serial no."
                value={deviceSerialNo}
                onChange={(e) => setDeviceSerialNo(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Activation key"
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value)}
                fullWidth
                size="small"
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Device model name"
                value={deviceModelName}
                onChange={(e) => setDeviceModelName(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Device model version"
                value={deviceModelVersion}
                onChange={(e) => setDeviceModelVersion(e.target.value)}
                fullWidth
                size="small"
              />
              <FormControlLabel
                control={
                  <Switch checked={taxInclusive} onChange={(e) => setTaxInclusive(e.target.checked)} />
                }
                label="Tax-inclusive prices"
              />
            </Stack>

            <TextField
              label="Device certificate (PEM)"
              value={certificatePem}
              onChange={(e) => setCertificatePem(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              size="small"
              placeholder="Paste new certificate to update (leave blank to keep existing)"
            />
            <TextField
              label="Private key (PEM)"
              value={privateKeyPem}
              onChange={(e) => setPrivateKeyPem(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              size="small"
              placeholder="Paste new private key to update (leave blank to keep existing)"
            />

            <Typography variant="subtitle2" fontWeight={700}>
              Device registration
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Register a new virtual device with ZIMRA (generates RSA key + CSR automatically), or paste an
              existing certificate and private key below. Requires OpenSSL on the server for CSR generation.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              disabled={saving || !deviceId || !deviceSerialNo || !activationKey}
              onClick={handleRegisterDevice}
              sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 600 }}
            >
              Register device with ZIMRA
            </Button>
            {hasCertificate && (
              <Chip label="Certificate on file" size="small" color="success" variant="outlined" />
            )}

            <Typography variant="caption" color="text.secondary">
              After registration, sync config to pull applicable tax rates from FDMS, then open a fiscal day.
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                disabled={saving || !deviceId || !activationKey}
                onClick={() =>
                  runAction("Verify taxpayer", () =>
                    verifyZimraTaxpayer(Number(deviceId), activationKey, environment)
                  )
                }
              >
                Verify taxpayer
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={saving}
                onClick={() => runAction("Ping device", pingZimraDevice)}
              >
                Ping FDMS
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={saving}
                onClick={() => runAction("Sync config", syncZimraFiscalConfig)}
              >
                Sync config
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={saving}
                onClick={() => runAction("Refresh status", refreshZimraFiscalStatus)}
              >
                Refresh status
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={saving}
                onClick={() => runAction("Open fiscal day", openZimraFiscalDay)}
              >
                Open fiscal day
              </Button>
              <Button
                size="small"
                variant="contained"
                color="warning"
                disabled={saving || fiscalDayStatus !== "FiscalDayOpened"}
                onClick={() => runAction("Close fiscal day", closeZimraFiscalDay)}
              >
                Close fiscal day (Z report)
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
