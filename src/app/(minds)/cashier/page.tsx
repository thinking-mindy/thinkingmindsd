"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Alert,
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
  styled,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Add,
  Download,
  FilterList,
  PointOfSale,
  Refresh,
  Search,
  WbSunnyOutlined,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import CreateTransactionDialog from "./components/CreateTransactionDialog";
import CashierStatCards, { type CashierMetrics } from "./components/CashierStatCards";
import CashierBreakdown from "./components/CashierBreakdown";
import TransactionDetailDrawer from "./components/TransactionDetailDrawer";
import CashierReceiptDialog from "./components/CashierReceiptDialog";
import type { CashierDraft, CashierTxnType } from "./components/CashierSidebar";
import {
  createCashierTransaction,
  getCashierTransactionsFiltered,
  getFinanceSettings,
} from "@/lib/desktop/finance-bridge";
import { getSchoolStudents } from "@/lib/desktop/school-bridge";
import type { SchoolStudent } from "@/types/school";
import { DEFAULT_FINANCE_SETTINGS, partitionPaymentTypes } from "@/lib/finance-shared";
import type { FinanceAccountCategory, FinancePaymentType } from "@/types/database";

const PageRoot = styled(Box)(({ theme }) => ({
  width: "100%",
  alignSelf: "stretch",
  background:
    theme.palette.mode === "dark"
      ? `radial-gradient(ellipse 80% 50% at 50% -10%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 60%), ${theme.palette.background.default}`
      : `radial-gradient(ellipse 80% 50% at 50% -10%, ${alpha(theme.palette.primary.light, 0.2)} 0%, transparent 55%), ${theme.palette.background.default}`,
}));

const HeroCard = styled(Box)(({ theme }) => ({
  borderRadius: 20,
  padding: theme.spacing(3, 3.5),
  marginBottom: theme.spacing(3),
  background: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
  color: theme.palette.text.primary,
}));

const FilterPanel = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(1.5),
  alignItems: "flex-end",
  padding: theme.spacing(2, 2.5),
  borderRadius: 16,
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  background: alpha(theme.palette.background.paper, 0.85),
  backdropFilter: "blur(12px)",
  marginBottom: theme.spacing(2.5),
}));

const TableCard = styled(TableContainer)(({ theme }) => ({
  borderRadius: 16,
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  background: alpha(theme.palette.background.paper, 0.9),
  overflow: "auto",
}));

const TX_TYPE_FILTERS: { value: CashierTxnType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sale", label: "Sales" },
  { value: "deposit", label: "Deposits" },
  { value: "refund", label: "Refunds" },
  { value: "withdrawal", label: "Withdrawals" },
];

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
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function exportCsv(rows: Record<string, any>[]) {
  const headers = ["Date", "Type", "Category", "Payment Type", "Description", "Reference", "Amount"];
  const lines = rows.map((tx) =>
    [
      new Date(tx.createdAt).toISOString(),
      tx.type,
      tx.accountCategory ?? "",
      tx.paymentType ?? "",
      (tx.description ?? "").replace(/"/g, '""'),
      tx.reference ?? "",
      tx.amount ?? 0,
    ]
      .map((v) => `"${v}"`)
      .join(",")
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cashier-${todayIso()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CashierPage() {
  const theme = useTheme();
  const { user } = useUser();
  const orgId = user?.publicMetadata?.companyId as string | undefined;
  const cashierId = user?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<FinanceAccountCategory[]>(
    DEFAULT_FINANCE_SETTINGS.accountCategories
  );
  const [paymentTypes, setPaymentTypes] = useState<FinancePaymentType[]>(
    DEFAULT_FINANCE_SETTINGS.paymentTypes
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    DEFAULT_FINANCE_SETTINGS.accountCategories[0]?.id ?? ""
  );
  const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState(
    DEFAULT_FINANCE_SETTINGS.paymentTypes.find((p) => p.id === "general-sale")?.id ??
      DEFAULT_FINANCE_SETTINGS.paymentTypes[0]?.id ??
      ""
  );
  const [transactions, setTransactions] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });
  const [draft, setDraft] = useState<CashierDraft>({
    type: "sale",
    amount: "",
    description: "",
    reference: "",
    isSchoolPayment: false,
    studentId: undefined,
  });
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [selectedTx, setSelectedTx] = useState<Record<string, any> | null>(null);
  const [receiptTx, setReceiptTx] = useState<Record<string, any> | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<CashierTxnType | "all">("all");
  const [showFilters, setShowFilters] = useState(true);
  const [clock, setClock] = useState("");

  const [filterStartDate, setFilterStartDate] = useState(todayIso());
  const [filterEndDate, setFilterEndDate] = useState(todayIso());
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [filterPaymentTypeId, setFilterPaymentTypeId] = useState("all");

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const selectedPaymentType = paymentTypes.find((p) => p.id === selectedPaymentTypeId) ?? null;

  const cashierName =
    user?.firstName ||
    user?.fullName?.split(" ")[0] ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Cashier";

  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const loadSettings = useCallback(async () => {
    if (!orgId) return;
    const settingsRes = await getFinanceSettings(orgId);
    if (settingsRes.success && settingsRes.data) {
      const cats = settingsRes.data.accountCategories.filter((c) => c.enabled);
      const types = settingsRes.data.paymentTypes.filter((p) => p.enabled);
      setCategories(cats);
      setPaymentTypes(types);
      setSelectedCategoryId((prev) => (cats.find((c) => c.id === prev) ? prev : cats[0]?.id ?? ""));
      setSelectedPaymentTypeId((prev) => (types.find((p) => p.id === prev) ? prev : types[0]?.id ?? ""));
    }
  }, [orgId]);

  const openCreateDialog = useCallback(() => {
    const { general } = partitionPaymentTypes(paymentTypes);
    setDraft({
      type: "sale",
      amount: "",
      description: "",
      reference: "",
      isSchoolPayment: false,
      studentId: undefined,
    });
    setSelectedPaymentTypeId(general[0]?.id ?? paymentTypes[0]?.id ?? "");
    setCreateOpen(true);
  }, [paymentTypes]);

  const loadStudents = useCallback(async () => {
    const res = await getSchoolStudents(undefined, "active");
    if (res.success) setStudents(res.data);
  }, []);

  const loadTransactions = useCallback(
    async (showRefresh = false) => {
      if (!orgId || !cashierId) return;
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const start = filterStartDate ? new Date(filterStartDate) : undefined;
        if (start) start.setHours(0, 0, 0, 0);
        const end = filterEndDate ? new Date(filterEndDate) : undefined;
        const txRes = await getCashierTransactionsFiltered({
          orgId,
          cashierId,
          startDate: start,
          endDate: end,
          limit: 1000,
        });
        if (txRes.success) setTransactions(txRes.data || []);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, cashierId, filterStartDate, filterEndDate]
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadSettings();
      await loadStudents();
      await loadTransactions();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, cashierId]);

  useEffect(() => {
    if (!loading) loadTransactions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStartDate, filterEndDate]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filterCategoryId !== "all" && tx.accountCategoryId !== filterCategoryId) return false;
      if (filterPaymentTypeId !== "all" && tx.paymentTypeId !== filterPaymentTypeId) return false;
      if (filterType !== "all" && tx.type !== filterType) return false;
      if (!q) return true;
      return (
        tx.description?.toLowerCase().includes(q) ||
        tx.reference?.toLowerCase().includes(q) ||
        tx.studentName?.toLowerCase().includes(q) ||
        tx.studentNumber?.toLowerCase().includes(q) ||
        tx.paymentType?.toLowerCase().includes(q) ||
        tx.accountCategory?.toLowerCase().includes(q)
      );
    });
  }, [transactions, filterCategoryId, filterPaymentTypeId, filterType, search]);

  const metrics = useMemo((): CashierMetrics & { byCategory: { label: string; value: number }[]; byPaymentType: { label: string; value: number }[] } => {
    let sales = 0;
    let refunds = 0;
    const byCategory: Record<string, number> = {};
    const byPaymentType: Record<string, number> = {};

    filteredTransactions.forEach((tx) => {
      const amt = tx.amount || 0;
      const sign = tx.type === "refund" || tx.type === "withdrawal" ? -1 : 1;
      const signed = amt * sign;
      if (tx.type === "sale" || tx.type === "deposit") sales += amt;
      else refunds += amt;
      const cat = tx.accountCategory || "Other";
      const pt = tx.paymentType || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + signed;
      byPaymentType[pt] = (byPaymentType[pt] || 0) + signed;
    });

    const net = sales - refunds;
    const count = filteredTransactions.length;
    return {
      net: Math.max(0, net),
      sales,
      refunds,
      count,
      avg: count > 0 ? net / count : 0,
      byCategory: Object.entries(byCategory).map(([label, value]) => ({ label, value })),
      byPaymentType: Object.entries(byPaymentType).map(([label, value]) => ({ label, value })),
    };
  }, [filteredTransactions]);

  const handleRecord = async () => {
    if (!orgId || !selectedCategory || !selectedPaymentType || !draft.amount) return;
    if (draft.isSchoolPayment && !draft.studentId) return;
    const student = students.find((s) => s._id === draft.studentId);
    setSubmitting(true);
    try {
      const result = await createCashierTransaction({
        orgId,
        type: draft.type,
        amount: parseFloat(draft.amount),
        description:
          draft.description ||
          (draft.isSchoolPayment && student
            ? `School fee · ${student.firstName} ${student.lastName}`
            : `${selectedPaymentType.name} · ${selectedCategory.name}`),
        reference: draft.reference,
        accountCategoryId: selectedCategory.id,
        accountCategory: selectedCategory.name,
        paymentTypeId: selectedPaymentType.id,
        paymentType: selectedPaymentType.name,
        currency: "USD",
        isSchoolPayment: draft.isSchoolPayment || undefined,
        studentId: draft.isSchoolPayment ? draft.studentId : undefined,
        studentNumber: draft.isSchoolPayment ? student?.studentNumber : undefined,
        studentName: draft.isSchoolPayment && student ? `${student.firstName} ${student.lastName}` : undefined,
        className: draft.isSchoolPayment ? student?.className : undefined,
      });
      if (result.success) {
        setSnackbar({ open: true, message: "Payment recorded successfully", severity: "success" });
        const { general } = partitionPaymentTypes(paymentTypes);
        setDraft({
          type: "sale",
          amount: "",
          description: "",
          reference: "",
          isSchoolPayment: false,
          studentId: undefined,
        });
        setSelectedPaymentTypeId(general[0]?.id ?? paymentTypes[0]?.id ?? "");
        setCreateOpen(false);
        if (result.data) {
          setReceiptTx(result.data);
          setReceiptOpen(true);
        }
        loadTransactions(true);
      } else {
        setSnackbar({ open: true, message: result.error || "Failed to record", severity: "error" });
      }
    } catch {
      setSnackbar({ open: true, message: "Failed to record transaction", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const setDatePreset = (preset: "today" | "week" | "month" | "all") => {
    const now = new Date();
    if (preset === "today") {
      const iso = todayIso();
      setFilterStartDate(iso);
      setFilterEndDate(iso);
    } else if (preset === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      setFilterStartDate(start.toISOString().slice(0, 10));
      setFilterEndDate(todayIso());
    } else if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilterStartDate(start.toISOString().slice(0, 10));
      setFilterEndDate(todayIso());
    } else {
      setFilterStartDate("");
      setFilterEndDate("");
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary">
            Opening your register…
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <PageRoot>
      <Box sx={{ width: "100%", p: { xs: 2, md: 3 } }}>
        <HeroCard>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                  color: "primary.main",
                }}
              >
                <PointOfSale sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
                  Cashier register
                </Typography>
                <Typography variant="h4" fontWeight={800} lineHeight={1.2}>
                  Hello, {cashierName}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <WbSunnyOutlined sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary">{clock}</Typography>
                  <Typography variant="body2" color="text.secondary">·</Typography>
                  <Typography variant="body2" color="text.secondary">{metrics.count} payments in view</Typography>
                </Stack>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => loadTransactions(true)}
                  disabled={refreshing}
                  sx={{ border: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}` }}
                >
                  <Refresh sx={{ animation: refreshing ? "spin 0.8s linear infinite" : "none", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                size="large"
                startIcon={<Add />}
                onClick={openCreateDialog}
                sx={{ textTransform: "none", fontWeight: 700, px: 3 }}
              >
                Create transaction
              </Button>
            </Stack>
          </Stack>
        </HeroCard>

        <CashierStatCards metrics={metrics} />

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <CashierBreakdown title="By category" items={metrics.byCategory} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CashierBreakdown title="By payment type" items={metrics.byPaymentType} />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              placeholder="Search reference, type, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 220 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {TX_TYPE_FILTERS.map(({ value, label }) => (
                <Chip
                  key={value}
                  label={label}
                  size="small"
                  onClick={() => setFilterType(value)}
                  variant={filterType === value ? "filled" : "outlined"}
                  color={filterType === value ? "primary" : "default"}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
            <Tooltip title="Toggle filters">
              <IconButton size="small" onClick={() => setShowFilters((v) => !v)} color={showFilters ? "primary" : "default"}>
                <FilterList />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export CSV">
              <span>
                <IconButton size="small" onClick={() => exportCsv(filteredTransactions)} disabled={filteredTransactions.length === 0}>
                  <Download />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

        {showFilters && (
          <FilterPanel>
              <TextField label="From" type="date" size="small" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 140 }} />
              <TextField label="To" type="date" size="small" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 140 }} />
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {(["today", "week", "month", "all"] as const).map((p) => (
                  <Chip key={p} label={p === "week" ? "7 days" : p === "month" ? "This month" : p.charAt(0).toUpperCase() + p.slice(1)} size="small" onClick={() => setDatePreset(p)} variant="outlined" sx={{ textTransform: "capitalize" }} />
                ))}
              </Stack>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Category</InputLabel>
                <Select label="Category" value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
                  <MenuItem value="all">All</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Payment type</InputLabel>
                <Select label="Payment type" value={filterPaymentTypeId} onChange={(e) => setFilterPaymentTypeId(e.target.value)}>
                  <MenuItem value="all">All</MenuItem>
                  {paymentTypes.map((pt) => (
                    <MenuItem key={pt.id} value={pt.id}>{pt.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
          </FilterPanel>
        )}

        <TableCard>
          <Table size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>When</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>Payment</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>Details</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "background.paper" }}>Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refreshing && filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={36} />
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={1}>
                      <PointOfSale sx={{ fontSize: 48, color: "text.disabled", opacity: 0.4 }} />
                      <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
                        No payments yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Record your first transaction or adjust filters
                      </Typography>
                      <Button variant="outlined" startIcon={<Add />} onClick={openCreateDialog} sx={{ mt: 1, textTransform: "none" }}>
                        Create transaction
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx, i) => {
                  const isOut = tx.type === "refund" || tx.type === "withdrawal";
                  return (
                    <TableRow
                      key={tx._id}
                      hover
                      onClick={() => setSelectedTx(tx)}
                      sx={{
                        cursor: "pointer",
                        bgcolor: i % 2 === 0 ? "transparent" : alpha(theme.palette.primary.main, 0.02),
                        "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                      }}
                    >
                      <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary", fontSize: "0.85rem" }}>
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Chip label={tx.type} size="small" color={typeColor[tx.type] || "default"} sx={{ height: 24, textTransform: "capitalize", fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{tx.accountCategory || "—"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{tx.paymentType || "—"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap fontWeight={500}>
                          {tx.description || tx.reference || "—"}
                        </Typography>
                        {tx.isSchoolPayment && tx.studentName && (
                          <Chip
                            label={`${tx.studentName}${tx.studentNumber ? ` · ${tx.studentNumber}` : ""}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mt: 0.5, maxWidth: "100%", height: 22, "& .MuiChip-label": { fontSize: "0.7rem" } }}
                          />
                        )}
                        {tx.reference && tx.description && (
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            Ref: {tx.reference}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={800} color={isOut ? "error.main" : "success.main"}>
                          {isOut ? "−" : "+"}
                          {formatCurrency(tx.amount || 0)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableCard>
      </Box>

      <CreateTransactionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        categories={categories}
        paymentTypes={paymentTypes}
        categoryId={selectedCategoryId}
        paymentTypeId={selectedPaymentTypeId}
        onCategoryChange={setSelectedCategoryId}
        onPaymentTypeChange={setSelectedPaymentTypeId}
        draft={draft}
        onDraftChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        onSubmit={handleRecord}
        loading={submitting}
        students={students}
      />

      <TransactionDetailDrawer
        tx={selectedTx}
        onClose={() => setSelectedTx(null)}
        onViewReceipt={(tx) => {
          setReceiptTx(tx);
          setReceiptOpen(true);
        }}
      />

      <CashierReceiptDialog
        open={receiptOpen}
        tx={receiptTx}
        onClose={() => {
          setReceiptOpen(false);
          setReceiptTx(null);
        }}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageRoot>
  );
}
