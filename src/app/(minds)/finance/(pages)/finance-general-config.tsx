"use client";

import { useEffect, useState } from "react";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Alert,
  Stack,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getFinanceSettings, updateFinanceSettings } from "@/lib/desktop/finance-bridge";
import { DEFAULT_FINANCE_SETTINGS } from "@/lib/finance-shared";

const CURRENCIES = ["USD", "ZWL", "ZAR", "EUR", "GBP"];

export default function FinanceGeneralConfig() {
  const { user } = useUser();
  const [currency, setCurrency] = useState(DEFAULT_FINANCE_SETTINGS.defaultCurrency ?? "USD");
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  useEffect(() => {
    const load = async () => {
      const orgId = user?.publicMetadata?.companyId as string | undefined;
      if (!orgId) return;
      const res = await getFinanceSettings(orgId);
      if (res.success && res.data?.defaultCurrency) {
        setCurrency(res.data.defaultCurrency);
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    const orgId = user?.publicMetadata?.companyId as string | undefined;
    if (!orgId) return;
    setSaving(true);
    try {
      const current = await getFinanceSettings(orgId);
      const base = current.data ?? DEFAULT_FINANCE_SETTINGS;
      const res = await updateFinanceSettings(orgId, { ...base, defaultCurrency: currency });
      if (res.success) {
        setSnackbar({ open: true, message: "General settings saved", severity: "success" });
      } else {
        setSnackbar({ open: true, message: res.error || "Failed to save", severity: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-end" }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Default currency</InputLabel>
          <Select
            label="Default currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
