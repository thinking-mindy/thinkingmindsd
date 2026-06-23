"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  styled,
} from "@mui/material";
import { PointOfSale, TrendingUp, PeopleAlt, ReceiptLong } from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getCashierTransactionsFiltered } from "@/lib/desktop/finance-bridge";
import { formatCurrency, formatUsd } from "@/lib/format-currency";
import { FlatCard } from "@/components/FlatCard";

function formatDate(d: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function inDateRange(txDate: Date, range: string, start?: string, end?: string) {
  if (range === "custom" && start && end) {
    const s = new Date(start);
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);
    return txDate >= s && txDate <= e;
  }
  const now = new Date();
  if (range === "month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return txDate >= s;
  }
  if (range === "quarter") {
    const s = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    return txDate >= s;
  }
  if (range === "year") {
    const s = new Date(now.getFullYear(), 0, 1);
    return txDate >= s;
  }
  return true;
}

export default function CashierReports({
  dateRange,
  startDate,
  endDate,
}: {
  dateRange: string;
  startDate: string;
  endDate: string;
}) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const orgId = user?.publicMetadata?.companyId as string | undefined;
      if (!orgId) return;
      setLoading(true);
      try {
        const res = await getCashierTransactionsFiltered({ orgId, limit: 2000 });
        if (res.success) setTransactions(res.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const filtered = useMemo(
    () =>
      transactions.filter((tx) =>
        inDateRange(new Date(tx.createdAt), dateRange, startDate, endDate)
      ),
    [transactions, dateRange, startDate, endDate]
  );

  const metrics = useMemo(() => {
    let sales = 0;
    let refunds = 0;
    const byCashier: Record<string, { count: number; total: number }> = {};
    const byPaymentType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    filtered.forEach((tx) => {
      const amt = tx.amount || 0;
      const cid = tx.cashierId || "unknown";
      if (!byCashier[cid]) byCashier[cid] = { count: 0, total: 0 };
      byCashier[cid].count += 1;
      if (tx.type === "sale" || tx.type === "deposit") {
        sales += amt;
        byCashier[cid].total += amt;
      } else if (tx.type === "refund" || tx.type === "withdrawal") {
        refunds += amt;
        byCashier[cid].total -= amt;
      }
      const pt = tx.paymentType || "Other";
      byPaymentType[pt] = (byPaymentType[pt] || 0) + (tx.type === "refund" || tx.type === "withdrawal" ? -amt : amt);
      const cat = tx.accountCategory || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + (tx.type === "refund" || tx.type === "withdrawal" ? -amt : amt);
    });

    return {
      sales,
      refunds,
      net: sales - refunds,
      count: filtered.length,
      cashierCount: Object.keys(byCashier).length,
      byCashier,
      byPaymentType,
      byCategory,
    };
  }, [filtered]);

  if (loading) {
    return (
      <Stack alignItems="center" py={6}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading cashier transactions…
        </Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Net collected
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="success.main">
                    {formatUsd(metrics.net)}
                  </Typography>
                </Box>
                <TrendingUp color="success" />
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Transactions
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {metrics.count}
                  </Typography>
                </Box>
                <ReceiptLong color="primary" />
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Cashiers active
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {metrics.cashierCount}
                  </Typography>
                </Box>
                <PeopleAlt color="secondary" />
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Refunds
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="error.main">
                    {formatCurrency(metrics.refunds)}
                  </Typography>
                </Box>
                <PointOfSale color="error" />
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FlatCard>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                By payment type
              </Typography>
              <Stack spacing={1}>
                {Object.entries(metrics.byPaymentType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, total]) => (
                    <Stack key={name} direction="row" justifyContent="space-between">
                      <Typography variant="body2">{name}</Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {formatCurrency(total)}
                      </Typography>
                    </Stack>
                  ))}
                {!Object.keys(metrics.byPaymentType).length && (
                  <Typography variant="body2" color="text.secondary">
                    No data in this period
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FlatCard>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                By account category
              </Typography>
              <Stack spacing={1}>
                {Object.entries(metrics.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, total]) => (
                    <Stack key={name} direction="row" justifyContent="space-between">
                      <Typography variant="body2">{name}</Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {formatCurrency(total)}
                      </Typography>
                    </Stack>
                  ))}
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      <FlatCard>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            All cashier transactions
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Payment type</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Cashier</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.slice(0, 100).map((tx) => (
                  <TableRow key={tx._id} hover>
                    <TableCell>{formatDate(tx.createdAt)}</TableCell>
                    <TableCell>
                      <Chip label={tx.type} size="small" sx={{ height: 22, textTransform: "capitalize" }} />
                    </TableCell>
                    <TableCell>{tx.paymentType || "—"}</TableCell>
                    <TableCell>{tx.accountCategory || "—"}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {(tx.cashierId || "—").slice(-8)}
                      </Typography>
                    </TableCell>
                    <TableCell>{tx.reference || tx.description || "—"}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {formatCurrency(tx.amount || 0)}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No cashier transactions in this period
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {filtered.length > 100 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Showing first 100 of {filtered.length} transactions
            </Typography>
          )}
        </CardContent>
      </FlatCard>
    </Box>
  );
}
