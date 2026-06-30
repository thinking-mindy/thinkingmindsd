"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import Close from "@mui/icons-material/Close";
import ReceiptPreview from "@/app/(minds)/pos/components/ReceiptPreview";
import { getSchoolReceiptFeeInfo } from "@/lib/desktop/school-bridge";
import { isTuitionPaymentType } from "@/lib/finance-shared";
import { cashierTransactionToReceipt, enrichSchoolFeeSnapshot, type CashierReceiptSource } from "@/lib/cashier-receipt";

function needsFeeLookup(tx: CashierReceiptSource): boolean {
  if (!tx.isSchoolPayment || !tx.studentId) return false;
  const paymentType = {
    id: String(tx.paymentTypeId ?? ""),
    name: String(tx.paymentType ?? ""),
  };
  if (!isTuitionPaymentType(paymentType)) return false;
  if (Number(tx.termFeesTotal ?? 0) <= 0) return true;
  const enriched = enrichSchoolFeeSnapshot(tx);
  const paymentAmount = Math.abs(Number(tx.amount ?? 0));
  const total = Number(tx.termFeesTotal ?? 0);
  const paid = Number(tx.termFeesPaid ?? 0);
  const remaining = Number(tx.termFeesRemaining ?? 0);
  return (
    paymentAmount > 0 &&
    Math.abs(paid + remaining - total) < 0.02 &&
    Math.abs(Number(enriched.termFeesPaid ?? 0) - paid) < 0.02
  );
}

export default function CashierReceiptDialog({
  open,
  tx,
  onClose,
}: {
  open: boolean;
  tx: CashierReceiptSource | null;
  onClose: () => void;
}) {
  const [resolvedTx, setResolvedTx] = useState<CashierReceiptSource | null>(null);
  const [loadingFees, setLoadingFees] = useState(false);

  useEffect(() => {
    if (!open || !tx) {
      setResolvedTx(null);
      setLoadingFees(false);
      return;
    }

    if (!needsFeeLookup(tx)) {
      setResolvedTx(enrichSchoolFeeSnapshot(tx));
      setLoadingFees(false);
      return;
    }

    let cancelled = false;
    setLoadingFees(true);
    setResolvedTx(tx);

    getSchoolReceiptFeeInfo(tx.studentId!).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setResolvedTx({
          ...tx,
          schoolTermId: res.data.schoolTermId,
          schoolTermLabel: res.data.schoolTermLabel,
          termFeesTotal: res.data.termFeesTotal,
          termFeesPaid: res.data.termFeesPaid,
          termFeesRemaining: res.data.termFeesRemaining,
        });
      } else {
        setResolvedTx(tx);
      }
      setLoadingFees(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, tx]);

  const receipt = useMemo(
    () => (resolvedTx ? cashierTransactionToReceipt(resolvedTx) : null),
    [resolvedTx]
  );

  return (
    <Dialog open={open && Boolean(receipt)} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Stack spacing={0.25}>
          <Typography variant="h6" fontWeight={800}>
            Transaction receipt
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Print or close when finished
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small" aria-label="close">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0, pb: 2 }}>
        {loadingFees && (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {receipt && !loadingFees && <ReceiptPreview receipt={receipt} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
