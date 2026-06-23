"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getCashierTransactionsFiltered } from "@/lib/desktop/finance-bridge";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatDate(d: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export default function SchoolPaymentsTab() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCashierTransactionsFiltered().then((res) => {
      if (res.success && res.data) {
        const school = (res.data as Record<string, unknown>[]).filter((tx) => tx.isSchoolPayment);
        setRows(school);
      }
      setLoading(false);
    });
  }, []);

  const total = useMemo(() => rows.reduce((sum, tx) => sum + Number(tx.amount ?? 0), 0), [rows]);

  if (loading) {
    return (
      <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        All cashier payments marked as school-related, linked to enrolled students.
      </Typography>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
        Total collected: {formatCurrency(total)}
      </Typography>

      <TableContainer sx={{ borderRadius: 3, border: 1, borderColor: "divider" }}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Payment type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Amount
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No school payments recorded yet.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((tx) => (
                <TableRow key={String(tx._id)} hover>
                  <TableCell>{formatDate(tx.createdAt as string)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {String(tx.studentName ?? "—")}
                    </Typography>
                    {Boolean(tx.studentNumber) && (
                      <Chip
                        label={String(tx.studentNumber)}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 0.5, fontFamily: "monospace", height: 22 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{String(tx.className ?? "—")}</TableCell>
                  <TableCell>{String(tx.paymentType ?? "—")}</TableCell>
                  <TableCell>{String(tx.reference ?? "—")}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700}>
                      {formatCurrency(Number(tx.amount ?? 0))}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
