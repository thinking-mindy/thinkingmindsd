"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FormControlLabel,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import {
  getAccountingSettings,
  updateAccountingSettings,
} from "@/lib/desktop/accounting-bridge";
import type { AccountingBasis } from "@/lib/accounting/types";

export default function FinanceLedgerConfig() {
  const { user } = useUser();
  const orgId = user?.publicMetadata?.companyId as string | undefined;

  const [basis, setBasis] = useState<AccountingBasis>("hybrid");
  const [autoPost, setAutoPost] = useState(true);
  const [cashOpening, setCashOpening] = useState("0");
  const [bankOpening, setBankOpening] = useState("0");
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (!orgId) return;
    void (async () => {
      const res = await getAccountingSettings(orgId);
      if (!res.success || !res.data) return;
      const d = res.data as Record<string, unknown>;
      setBasis((d.basis as AccountingBasis) ?? "hybrid");
      setAutoPost(d.autoPostFromOps !== false);
      setCashOpening(String(d.cashOpeningBalance ?? 0));
      setBankOpening(String(d.bankOpeningBalance ?? 0));
    })();
  }, [orgId]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const res = await updateAccountingSettings(orgId, {
        basis,
        autoPostFromOps: autoPost,
        cashOpeningBalance: Number(cashOpening) || 0,
        bankOpeningBalance: Number(bankOpening) || 0,
      });
      setSnackbar({
        open: true,
        message: res.success ? "Ledger settings saved" : res.error ?? "Failed to save",
        severity: res.success ? "success" : "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap={3} maxWidth={520}>
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        These settings apply to the <strong>general ledger</strong> only. Currency and cashier options live under
        Operations → Settings.
      </Alert>

      <TextField
        select
        label="Reporting basis"
        value={basis}
        onChange={(e) => setBasis(e.target.value as AccountingBasis)}
        fullWidth
        helperText="Controls how revenue and expenses appear on GL statements."
      >
        <MenuItem value="hybrid">Hybrid (recommended)</MenuItem>
        <MenuItem value="accrual">Accrual</MenuItem>
        <MenuItem value="cash">Cash</MenuItem>
      </TextField>

      <FormControlLabel
        control={<Switch checked={autoPost} onChange={(e) => setAutoPost(e.target.checked)} />}
        label="Auto-post journals from operations"
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: -2 }}>
        When enabled, invoices, payments, expenses, POS, cashier, and payroll events create ledger entries automatically.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <TextField
          label="Opening cash balance"
          type="number"
          value={cashOpening}
          onChange={(e) => setCashOpening(e.target.value)}
          fullWidth
        />
        <TextField
          label="Opening bank balance"
          type="number"
          value={bankOpening}
          onChange={(e) => setBankOpening(e.target.value)}
          fullWidth
        />
      </Stack>

      <Button
        variant="contained"
        startIcon={<Save />}
        onClick={() => void handleSave()}
        disabled={saving}
        sx={{ alignSelf: "flex-start" }}
      >
        {saving ? "Saving…" : "Save ledger settings"}
      </Button>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Stack>
  );
}
