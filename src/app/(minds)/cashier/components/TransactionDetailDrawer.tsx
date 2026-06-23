"use client";

import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import Close from "@mui/icons-material/Close";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";

const typeColor: Record<string, "success" | "error" | "info" | "warning"> = {
  sale: "success",
  refund: "error",
  deposit: "info",
  withdrawal: "warning",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatDate(d: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} textAlign="right">
        {value}
      </Typography>
    </Stack>
  );
}

export default function TransactionDetailDrawer({
  tx,
  onClose,
  onViewReceipt,
}: {
  tx: Record<string, any> | null;
  onClose: () => void;
  onViewReceipt?: (tx: Record<string, any>) => void;
}) {
  const open = Boolean(tx);
  const isOut = tx?.type === "refund" || tx?.type === "withdrawal";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: "100%", sm: 400 }, borderRadius: "16px 0 0 16px" },
      }}
    >
      {tx && (
        <Box sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={(theme) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: "primary.main",
                })}
              >
                <ReceiptLongOutlined />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Payment details
                </Typography>
                <Chip
                  label={tx.type}
                  size="small"
                  color={typeColor[tx.type] || "default"}
                  sx={{ mt: 0.5, textTransform: "capitalize", height: 22 }}
                />
              </Box>
            </Stack>
            <IconButton onClick={onClose} size="small" aria-label="close">
              <Close />
            </IconButton>
          </Stack>

          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ color: isOut ? "error.main" : "success.main", mb: 3 }}
          >
            {isOut ? "−" : "+"}
            {formatCurrency(tx.amount || 0)}
          </Typography>

          <Stack spacing={2} sx={{ flex: 1 }}>
            <Row label="Date" value={formatDate(tx.createdAt)} />
            <Divider />
            <Row label="Category" value={tx.accountCategory || "—"} />
            <Row label="Payment type" value={tx.paymentType || "—"} />
            <Row label="Reference" value={tx.reference || "—"} />
            <Row label="Description" value={tx.description || "—"} />
            {tx.isSchoolPayment && (
              <>
                <Row
                  label="Student"
                  value={
                    tx.studentName
                      ? `${tx.studentName}${tx.studentNumber ? ` (${tx.studentNumber})` : ""}`
                      : "—"
                  }
                />
                {tx.className && <Row label="Class" value={tx.className} />}
                {tx.schoolTermLabel && <Row label="Term" value={tx.schoolTermLabel} />}
                {Number(tx.termFeesTotal) > 0 && (
                  <>
                    <Row label="Term fees" value={formatCurrency(Number(tx.termFeesTotal))} />
                    <Row label="Paid this term" value={formatCurrency(Number(tx.termFeesPaid ?? 0))} />
                    <Row
                      label="Remaining"
                      value={
                        <Typography
                          component="span"
                          variant="body2"
                          fontWeight={700}
                          color={Number(tx.termFeesRemaining) > 0 ? "error.main" : "success.main"}
                        >
                          {formatCurrency(Number(tx.termFeesRemaining ?? 0))}
                        </Typography>
                      }
                    />
                  </>
                )}
              </>
            )}
            {tx.paymentMethod && <Row label="Method" value={tx.paymentMethod} />}
          </Stack>

          {onViewReceipt && (
            <Button
              variant="contained"
              fullWidth
              startIcon={<PrintOutlined />}
              onClick={() => onViewReceipt(tx)}
              sx={{ mt: 3, textTransform: "none", fontWeight: 700, borderRadius: 2 }}
            >
              View receipt
            </Button>
          )}
        </Box>
      )}
    </Drawer>
  );
}
