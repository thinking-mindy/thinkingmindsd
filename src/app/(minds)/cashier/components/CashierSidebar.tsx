"use client";

import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import {
  CallMade,
  CallReceived,
  CheckCircle,
  PointOfSale,
  SwapHoriz,
} from "@mui/icons-material";
import type { FinanceAccountCategory, FinancePaymentType } from "@/types/database";

export type CashierTxnType = "sale" | "refund" | "deposit" | "withdrawal";

export type CashierDraft = {
  type: CashierTxnType;
  amount: string;
  description: string;
  reference: string;
  isSchoolPayment?: boolean;
  studentId?: string;
};

export const TX_TYPES: { value: CashierTxnType; label: string; Icon: typeof PointOfSale }[] = [
  { value: "sale", label: "Sale", Icon: PointOfSale },
  { value: "refund", label: "Refund", Icon: SwapHoriz },
  { value: "deposit", label: "Deposit", Icon: CallReceived },
  { value: "withdrawal", label: "Withdrawal", Icon: CallMade },
];

export default function CashierSidebar({
  category,
  paymentType,
  draft,
  onDraftChange,
  onSubmit,
  loading,
  todayTotal,
  todayCount,
}: {
  category: FinanceAccountCategory | null;
  paymentType: FinancePaymentType | null;
  draft: CashierDraft;
  onDraftChange: (patch: Partial<CashierDraft>) => void;
  onSubmit: () => void;
  loading?: boolean;
  todayTotal: number;
  todayCount: number;
}) {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const canSubmit = category && paymentType && draft.amount && parseFloat(draft.amount) > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Box sx={{ p: 2.5, flex: 1, overflowY: "auto" }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Record payment
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {paymentType ? paymentType.name : "Select a payment type"} · {category ? category.name : "Pick category"}
        </Typography>

        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.8 }}>
          Transaction type
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1, mb: 2 }}>
          {TX_TYPES.map(({ value, label, Icon }) => (
            <Chip
              key={value}
              icon={<Icon sx={{ fontSize: 16 }} />}
              label={label}
              onClick={() => onDraftChange({ type: value })}
              variant={draft.type === value ? "filled" : "outlined"}
              color={draft.type === value ? "primary" : "default"}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>

        <TextField
          label="Amount"
          type="number"
          fullWidth
          size="small"
          value={draft.amount}
          onChange={(e) => onDraftChange({ amount: e.target.value })}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 700, color: "primary.main" }}>$</Typography>,
            inputProps: { min: 0, step: 0.01 },
          }}
        />
        <TextField
          label="Reference (optional)"
          fullWidth
          size="small"
          value={draft.reference}
          onChange={(e) => onDraftChange({ reference: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Description (optional)"
          fullWidth
          size="small"
          multiline
          rows={2}
          value={draft.description}
          onChange={(e) => onDraftChange({ description: e.target.value })}
        />
      </Box>

      <Divider />
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            My today ({todayCount})
          </Typography>
          <Typography variant="subtitle1" fontWeight={800} color="success.main">
            {formatCurrency(todayTotal)}
          </Typography>
        </Stack>
        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={!canSubmit || loading}
          onClick={onSubmit}
          startIcon={<CheckCircle />}
          sx={(theme) => ({
            borderRadius: 2,
            py: 1.25,
            bgcolor: "primary.main",
            "&:hover": { bgcolor: "primary.dark" },
          })}
        >
          {loading ? "Recording…" : "Record transaction"}
        </Button>
      </Box>
    </Box>
  );
}
