"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import { Refresh, Search } from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getCashierTransactionsFiltered } from "@/lib/desktop/finance-bridge";
import { formatCurrency } from "@/lib/format-currency";
import { FlatCard } from "@/components/FlatCard";
import {
  aggregateSchoolPayments,
  classifySchoolPayment,
  isSchoolCollectionTx,
  normalizeSchoolPaymentTx,
  signedSchoolAmount,
  type SchoolPaymentCategory,
  type SchoolPaymentTx,
} from "@/lib/school-finance";

const CATEGORY_LABELS: Record<SchoolPaymentCategory | "all", string> = {
  all: "All types",
  tuition: "Tuition",
  transport: "Transport",
  uniform: "Uniform",
  other: "Other",
};

const CATEGORY_COLORS: Record<SchoolPaymentCategory, string> = {
  tuition: "#2196f3",
  transport: "#ff9800",
  uniform: "#9c27b0",
  other: "#607d8b",
};

export default function SchoolCollectionsTab() {
  const { user } = useUser();
  const orgId = user?.publicMetadata?.companyId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<SchoolPaymentTx[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SchoolPaymentCategory | "all">("all");

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await getCashierTransactionsFiltered(orgId ? { orgId } : undefined);
        if (res.success && res.data) {
          setRows(
            (res.data as SchoolPaymentTx[])
              .map(normalizeSchoolPaymentTx)
              .filter(isSchoolCollectionTx)
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totals = useMemo(() => aggregateSchoolPayments(rows), [rows]);

  const filtered = useMemo(() => {
    let list = [...rows].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    );
    if (categoryFilter !== "all") {
      list = list.filter((tx) => classifySchoolPayment(tx) === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (tx) =>
          tx.studentName?.toLowerCase().includes(q) ||
          tx.studentNumber?.toLowerCase().includes(q) ||
          tx.className?.toLowerCase().includes(q) ||
          tx.paymentType?.toLowerCase().includes(q) ||
          tx.reference?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, categoryFilter, search]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Fee collections ledger
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Every school payment recorded through Cashier — tuition, transport, and uniform.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={() => void loadData(true)} disabled={refreshing}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
        {(["tuition", "transport", "uniform"] as const).map((key) => (
          <FlatCard key={key} sx={{ flex: 1 }}>
            <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>
                {CATEGORY_LABELS[key]}
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: CATEGORY_COLORS[key] }}>
                {formatCurrency(totals[key])}
              </Typography>
            </CardContent>
          </FlatCard>
        ))}
        <FlatCard sx={{ flex: 1 }}>
          <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Total collected
            </Typography>
            <Typography variant="h6" fontWeight={800} color="success.main">
              {formatCurrency(totals.total)}
            </Typography>
          </CardContent>
        </FlatCard>
      </Stack>

      <FlatCard>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search student, class, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: "text.secondary", fontSize: 20 }} />,
              }}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Fee type</InputLabel>
              <Select
                label="Fee type"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as SchoolPaymentCategory | "all")}
              >
                {(Object.keys(CATEGORY_LABELS) as (SchoolPaymentCategory | "all")[]).map((key) => (
                  <MenuItem key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <TableContainer sx={{ borderRadius: 2, border: 1, borderColor: "divider" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.divider, 0.06) }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fee type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Term</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Amount
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary" fontWeight={600}>
                        No school collections found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tx) => {
                    const category = classifySchoolPayment(tx);
                    const color = CATEGORY_COLORS[category];
                    return (
                      <TableRow key={String(tx._id)} hover>
                        <TableCell>
                          {tx.createdAt
                            ? new Date(tx.createdAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {tx.studentName || "—"}
                          </Typography>
                          {tx.studentNumber && (
                            <Chip
                              label={tx.studentNumber}
                              size="small"
                              variant="outlined"
                              sx={{ mt: 0.5, height: 22, fontFamily: "monospace", fontSize: "0.7rem" }}
                            />
                          )}
                        </TableCell>
                        <TableCell>{tx.className || "—"}</TableCell>
                        <TableCell>
                          <Chip
                            label={tx.paymentType || CATEGORY_LABELS[category]}
                            size="small"
                            sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 700, fontSize: "0.7rem" }}
                          />
                        </TableCell>
                        <TableCell>{tx.schoolTermLabel || "—"}</TableCell>
                        <TableCell>{tx.reference || "—"}</TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={800}
                            color={signedSchoolAmount(tx) < 0 ? "error.main" : "success.main"}
                          >
                            {formatCurrency(signedSchoolAmount(tx))}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </FlatCard>
    </Box>
  );
}
