"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  alpha,
  styled,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { getCashierTransactionsFiltered } from "@/lib/desktop/finance-bridge";

const TxCard = styled(Box)(({ theme }) => ({
  borderRadius: 14,
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  padding: theme.spacing(1.5, 2),
  transition: "all 0.2s ease",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    bgcolor: alpha(theme.palette.primary.main, 0.04),
  },
}));

function formatWhen(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const typeColor: Record<string, "success" | "error" | "info" | "warning"> = {
  sale: "success",
  refund: "error",
  deposit: "info",
  withdrawal: "warning",
};

export default function CashierHistory({
  open,
  onClose,
  orgId,
  cashierId,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  cashierId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!orgId || !cashierId) return;
    setLoading(true);
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const res = await getCashierTransactionsFiltered({
        orgId,
        cashierId,
        startDate: start,
        limit: 200,
      });
      if (res.success) setTransactions(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orgId, cashierId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        tx.description?.toLowerCase().includes(q) ||
        tx.reference?.toLowerCase().includes(q) ||
        tx.paymentType?.toLowerCase().includes(q) ||
        tx.accountCategory?.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ReceiptLongOutlinedIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              My transactions today
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Only payments you recorded on this register
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          size="small"
          fullWidth
          placeholder="Search reference, type, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={36} />
          </Stack>
        ) : filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            No transactions yet today.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {filtered.map((tx) => (
              <TxCard key={tx._id}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip label={tx.type} size="small" color={typeColor[tx.type] || "default"} sx={{ height: 22 }} />
                      {tx.paymentType && (
                        <Chip label={tx.paymentType} size="small" variant="outlined" sx={{ height: 22 }} />
                      )}
                    </Stack>
                    <Typography variant="body2" fontWeight={600}>
                      {tx.description || tx.reference || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tx.accountCategory || "—"} · {formatWhen(tx.createdAt)}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" fontWeight={800} color={tx.type === "refund" || tx.type === "withdrawal" ? "error.main" : "success.main"}>
                    {formatCurrency(tx.amount || 0)}
                  </Typography>
                </Stack>
              </TxCard>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={load} disabled={loading}>
          Refresh
        </Button>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
