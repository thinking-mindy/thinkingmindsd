"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
  alpha,
  styled,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Add,
  AccountBalanceWallet,
  Category,
  Delete,
  Save,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getFinanceSettings, updateFinanceSettings } from "@/lib/desktop/finance-bridge";
import { DEFAULT_FINANCE_SETTINGS } from "@/lib/finance-shared";
import type { FinanceAccountCategory, FinancePaymentType } from "@/types/database";
import { FlatCard } from "@/components/FlatCard";

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function FinanceCashierConfig({ embedded = false }: { embedded?: boolean }) {
  const { user } = useUser();
  const [categories, setCategories] = useState<FinanceAccountCategory[]>(
    DEFAULT_FINANCE_SETTINGS.accountCategories
  );
  const [paymentTypes, setPaymentTypes] = useState<FinancePaymentType[]>(
    DEFAULT_FINANCE_SETTINGS.paymentTypes
  );
  const [newCategory, setNewCategory] = useState("");
  const [newPaymentType, setNewPaymentType] = useState("");
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
      if (res.success && res.data) {
        setCategories(res.data.accountCategories);
        setPaymentTypes(res.data.paymentTypes);
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    const orgId = user?.publicMetadata?.companyId as string | undefined;
    if (!orgId) return;
    setSaving(true);
    try {
      const res = await updateFinanceSettings(orgId, { accountCategories: categories, paymentTypes });
      if (res.success) {
        setSnackbar({ open: true, message: "Cashier settings saved", severity: "success" });
      } else {
        setSnackbar({ open: true, message: res.error || "Failed to save", severity: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/\s+/g, "_");
    setCategories((prev) => [
      ...prev,
      { id: makeId("cat"), name, slug, enabled: true },
    ]);
    setNewCategory("");
  };

  const addPaymentType = () => {
    const name = newPaymentType.trim();
    if (!name) return;
    setPaymentTypes((prev) => [...prev, { id: makeId("fee"), name, enabled: true }]);
    setNewPaymentType("");
  };

  return (
    <Box sx={{ mt: embedded ? 0 : 4 }}>
      <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mb: embedded ? 2 : 2 }}>
        {!embedded && (
          <Box sx={{ flex: 1, mr: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Cashier configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Account categories and payment types used on the Cashier register (/cashier).
            </Typography>
          </Box>
        )}
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <AccountBalanceWallet color="primary" />
                <Typography variant="subtitle1" fontWeight={700}>
                  Account categories
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Where money is received — e.g. Cash, Bank, Other.
              </Typography>
              <Stack spacing={1} sx={{ mb: 2 }}>
                {categories.map((cat) => (
                  <Stack
                    key={cat.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: (t) => `1px solid ${alpha(t.palette.divider, 0.2)}`,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Category fontSize="small" color="action" />
                      <Typography fontWeight={600}>{cat.name}</Typography>
                      <Chip label={cat.slug} size="small" variant="outlined" />
                    </Stack>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={categories.length <= 1}
                      onClick={() => setCategories((prev) => prev.filter((c) => c.id !== cat.id))}
                      aria-label={`Remove ${cat.name}`}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  label="New category"
                  placeholder="e.g. Mobile Money"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                />
                <Button variant="outlined" startIcon={<Add />} onClick={addCategory}>
                  Add
                </Button>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Category color="secondary" />
                <Typography variant="subtitle1" fontWeight={700}>
                  Payment types
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                What the payment is for — e.g. Tuition Fees, Transport, Uniform Fee.
              </Typography>
              <Stack spacing={1} sx={{ mb: 2 }}>
                {paymentTypes.map((pt) => (
                  <Stack
                    key={pt.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: (t) => `1px solid ${alpha(t.palette.divider, 0.2)}`,
                    }}
                  >
                    <Typography fontWeight={600}>{pt.name}</Typography>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={paymentTypes.length <= 1}
                      onClick={() => setPaymentTypes((prev) => prev.filter((p) => p.id !== pt.id))}
                      aria-label={`Remove ${pt.name}`}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  label="New payment type"
                  placeholder="e.g. Boarding Fees"
                  value={newPaymentType}
                  onChange={(e) => setNewPaymentType(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPaymentType()}
                />
                <Button variant="outlined" startIcon={<Add />} onClick={addPaymentType}>
                  Add
                </Button>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

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
    </Box>
  );
}
