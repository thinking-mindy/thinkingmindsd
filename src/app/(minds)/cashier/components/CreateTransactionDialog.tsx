"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  LinearProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from "@mui/material";
import {
  AccountBalance,
  AccountBalanceWallet,
  AttachMoney,
  CheckCircle,
  CheckroomOutlined,
  Close,
  DirectionsBusOutlined,
  HandymanOutlined,
  MoreHoriz,
  PointOfSaleOutlined,
  School,
  SchoolOutlined,
  ShoppingBagOutlined,
} from "@mui/icons-material";
import { getStudentTermFeeBalance } from "@/lib/desktop/school-bridge";
import { EDUCATION_LEVEL_META } from "@/lib/school-levels";
import type { SchoolStudent } from "@/types/school";
import { formatSchoolCurrency, type StudentTermFeeBalance } from "@/lib/school-fees";
import { partitionPaymentTypes } from "@/lib/finance-shared";
import PaymentTypeCard from "./PaymentTypeCard";
import type { CashierDraft } from "./CashierSidebar";
import { TX_TYPES } from "./CashierSidebar";
import type { FinanceAccountCategory, FinancePaymentType } from "@/types/database";

function categoryIcon(slug: string) {
  if (slug === "cash") return <AttachMoney sx={{ fontSize: 18 }} />;
  if (slug === "bank") return <AccountBalance sx={{ fontSize: 18 }} />;
  return <AccountBalanceWallet sx={{ fontSize: 18 }} />;
}

function paymentTypeMeta(pt: FinancePaymentType, schoolMode: boolean) {
  const id = pt.id.toLowerCase();
  if (schoolMode) {
    if (id.includes("tuition")) return { icon: <SchoolOutlined sx={{ fontSize: 20 }} />, subtitle: "Term & class fees" };
    if (id.includes("transport")) return { icon: <DirectionsBusOutlined sx={{ fontSize: 20 }} />, subtitle: "Bus & travel" };
    if (id.includes("uniform")) return { icon: <CheckroomOutlined sx={{ fontSize: 20 }} />, subtitle: "Kit & dress code" };
    return { icon: <SchoolOutlined sx={{ fontSize: 20 }} />, subtitle: "School charge" };
  }
  if (id.includes("supply") || id.includes("supplies"))
    return { icon: <ShoppingBagOutlined sx={{ fontSize: 20 }} />, subtitle: "Stock & materials" };
  if (id.includes("service")) return { icon: <HandymanOutlined sx={{ fontSize: 20 }} />, subtitle: "Labour & services" };
  if (id.includes("misc")) return { icon: <MoreHoriz sx={{ fontSize: 20 }} />, subtitle: "Other income" };
  return { icon: <PointOfSaleOutlined sx={{ fontSize: 20 }} />, subtitle: "Counter sale" };
}

export default function CreateTransactionDialog({
  open,
  onClose,
  categories,
  paymentTypes,
  categoryId,
  paymentTypeId,
  onCategoryChange,
  onPaymentTypeChange,
  draft,
  onDraftChange,
  onSubmit,
  loading,
  students = [],
}: {
  open: boolean;
  onClose: () => void;
  categories: FinanceAccountCategory[];
  paymentTypes: FinancePaymentType[];
  categoryId: string;
  paymentTypeId: string;
  onCategoryChange: (id: string) => void;
  onPaymentTypeChange: (id: string) => void;
  draft: CashierDraft;
  onDraftChange: (patch: Partial<CashierDraft>) => void;
  onSubmit: () => void;
  loading?: boolean;
  students?: SchoolStudent[];
}) {
  const category = categories.find((c) => c.id === categoryId) ?? null;
  const paymentType = paymentTypes.find((p) => p.id === paymentTypeId) ?? null;
  const amount = parseFloat(draft.amount);
  const isSchool = Boolean(draft.isSchoolPayment);

  const { school: schoolTypes, general: generalTypes } = useMemo(
    () => partitionPaymentTypes(paymentTypes),
    [paymentTypes]
  );
  const visibleTypes = isSchool ? schoolTypes : generalTypes;

  const activeStudents = students.filter((s) => s.status === "active");
  const selectedStudent = activeStudents.find((s) => s._id === draft.studentId) ?? null;
  const schoolValid = !isSchool || Boolean(draft.studentId);
  const canSubmit = category && paymentType && draft.amount && amount > 0 && schoolValid;

  const [feeBalance, setFeeBalance] = useState<StudentTermFeeBalance | null>(null);

  useEffect(() => {
    if (!isSchool || !draft.studentId) {
      setFeeBalance(null);
      return;
    }
    const pending = parseFloat(draft.amount) || 0;
    let cancelled = false;
    getStudentTermFeeBalance(draft.studentId, pending).then((res) => {
      if (!cancelled && res.success && res.data) setFeeBalance(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [isSchool, draft.studentId, draft.amount]);

  const setPaymentMode = (school: boolean) => {
    const types = school ? schoolTypes : generalTypes;
    const nextTypeId = types.find((t) => t.id === paymentTypeId)?.id ?? types[0]?.id ?? "";
    onDraftChange({
      isSchoolPayment: school,
      studentId: school ? draft.studentId : undefined,
    });
    if (nextTypeId && nextTypeId !== paymentTypeId) onPaymentTypeChange(nextTypeId);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: (theme) => ({
          borderRadius: 4,
          overflow: "hidden",
          boxShadow: `0 24px 64px ${alpha(theme.palette.common.black, 0.18)}`,
        }),
      }}
    >
      <Box
        sx={(theme) => ({
          px: 3,
          pt: 2.5,
          pb: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        })}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", p: 0, mb: 0 }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              New payment
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={isSchool ? "School fees" : "Regular"}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 700, height: 22 }}
              />
              <Typography variant="body2" color="text.secondary">
                {paymentType?.name ?? "Pick category"} · {category?.name ?? "Pick method"}
              </Typography>
            </Stack>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="close" sx={{ mt: -0.5 }}>
            <Close />
          </IconButton>
        </DialogTitle>
      </Box>

      <DialogContent sx={{ px: 3, pt: 2 }}>
        {categories.length > 0 && (
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs
              value={categoryId}
              onChange={(_, v) => onCategoryChange(v)}
              variant="fullWidth"
              sx={{
                minHeight: 42,
                "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 600 },
              }}
            >
              {categories.map((cat) => (
                <Tab key={cat.id} value={cat.id} icon={categoryIcon(cat.slug)} iconPosition="start" label={cat.name} />
              ))}
            </Tabs>
          </Box>
        )}

        <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1.2}>
          What is this payment for?
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={isSchool ? "school" : "regular"}
          onChange={(_, v) => v && setPaymentMode(v === "school")}
          sx={{ mt: 1, mb: 2.5 }}
        >
          <ToggleButton
            value="school"
            sx={(theme) => ({
              py: 1.75,
              textTransform: "none",
              fontWeight: 700,
              gap: 1,
              borderRadius: "12px 0 0 12px !important",
              "&.Mui-selected": {
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: "primary.main",
                borderColor: alpha(theme.palette.primary.main, 0.4),
                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.16) },
              },
            })}
          >
            <School sx={{ fontSize: 22, color: "primary.main" }} />
            <Box textAlign="left">
              <Typography variant="body2" fontWeight={800} lineHeight={1.2}>
                School fees
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Tuition, transport, uniform
              </Typography>
            </Box>
          </ToggleButton>
          <ToggleButton
            value="regular"
            sx={(theme) => ({
              py: 1.75,
              textTransform: "none",
              fontWeight: 700,
              gap: 1,
              borderRadius: "0 12px 12px 0 !important",
              "&.Mui-selected": {
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: "primary.main",
                borderColor: alpha(theme.palette.primary.main, 0.4),
                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.16) },
              },
            })}
          >
            <PointOfSaleOutlined sx={{ fontSize: 22, color: "primary.main" }} />
            <Box textAlign="left">
              <Typography variant="body2" fontWeight={800} lineHeight={1.2}>
                Regular expense
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Sales, supplies & services
              </Typography>
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>

        {isSchool && (
          <Box
            sx={(theme) => ({
              mb: 2.5,
              p: 2,
              borderRadius: 2.5,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
              bgcolor: alpha(theme.palette.primary.main, 0.04),
            })}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <SchoolOutlined color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={800}>
                Link to student
              </Typography>
              <Chip label="Required" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
            </Stack>
            <Autocomplete
              options={activeStudents}
              value={selectedStudent}
              onChange={(_, student) => onDraftChange({ studentId: student?._id })}
              getOptionLabel={(s) => `${s.firstName} ${s.lastName} (${s.studentNumber})`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search name or student number…"
                  size="small"
                  sx={{ bgcolor: "background.paper", borderRadius: 1 }}
                />
              )}
              renderOption={(props, s) => (
                <li {...props} key={s._id}>
                  <Stack>
                    <Typography variant="body2" fontWeight={600}>
                      {s.firstName} {s.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                      {s.studentNumber}
                      {s.className ? ` · ${s.className}` : ""}
                      {s.educationLevel
                        ? ` · ${EDUCATION_LEVEL_META[s.educationLevel]?.shortLabel ?? s.educationLevel}`
                        : ""}
                    </Typography>
                  </Stack>
                </li>
              )}
              noOptionsText="No active students — enrol them in School module"
            />
            {feeBalance?.hasClassFees && (
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary">
                    {feeBalance.termLabel}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="primary.main">
                    {feeBalance.percentPaid}% paid
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={feeBalance.percentPaid}
                  color={feeBalance.remainingBalance <= 0 ? "success" : "primary"}
                  sx={{ height: 6, borderRadius: 3, mb: 1 }}
                />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Term fees {formatSchoolCurrency(feeBalance.feesPerTerm)}
                  </Typography>
                  <Typography variant="body2" fontWeight={800} color={feeBalance.remainingBalance > 0 ? "error.main" : "success.main"}>
                    {feeBalance.remainingBalance > 0
                      ? `${formatSchoolCurrency(feeBalance.remainingBalance)} remaining`
                      : "Fully paid"}
                  </Typography>
                </Stack>
              </Box>
            )}
            {feeBalance && !feeBalance.hasClassFees && draft.studentId && (
              <Typography variant="caption" color="warning.main" sx={{ mt: 1.5, display: "block" }}>
                Assign this student to a class with fees per term in School → Classes.
              </Typography>
            )}
          </Box>
        )}

        <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1.2}>
          {isSchool ? "Fee category" : "Expense category"}
        </Typography>
        {visibleTypes.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            No categories configured — add them in Finance settings.
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
              gap: 1,
              mt: 1,
              mb: 2.5,
            }}
          >
            {visibleTypes.map((pt) => {
              const meta = paymentTypeMeta(pt, isSchool);
              return (
                <PaymentTypeCard
                  key={pt.id}
                  name={pt.name}
                  subtitle={meta.subtitle}
                  icon={meta.icon}
                  selected={paymentTypeId === pt.id}
                  onSelect={() => onPaymentTypeChange(pt.id)}
                />
              );
            })}
          </Box>
        )}

        <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>
          Transaction type
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1, mb: 2.5 }}>
          {TX_TYPES.map(({ value, label, Icon }) => (
            <Chip
              key={value}
              icon={<Icon sx={{ fontSize: 16 }} />}
              label={label}
              onClick={() => onDraftChange({ type: value })}
              variant={draft.type === value ? "filled" : "outlined"}
              color={draft.type === value ? "primary" : "default"}
              sx={{ fontWeight: 600, px: 0.5 }}
            />
          ))}
        </Stack>

        <TextField
          label="Amount"
          type="number"
          fullWidth
          autoFocus={!isSchool}
          value={draft.amount}
          onChange={(e) => onDraftChange({ amount: e.target.value })}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <Typography sx={{ mr: 1, fontWeight: 800, fontSize: "1.25rem", color: "primary.main" }}>$</Typography>
            ),
            inputProps: { min: 0, step: 0.01 },
            sx: { fontSize: "1.25rem", fontWeight: 700 },
          }}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Reference"
            fullWidth
            size="small"
            placeholder="Receipt #, invoice…"
            value={draft.reference}
            onChange={(e) => onDraftChange({ reference: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            size="small"
            placeholder="Optional note"
            value={draft.description}
            onChange={(e) => onDraftChange({ description: e.target.value })}
          />
        </Stack>

        {canSubmit && (
          <Box
            sx={(theme) => ({
              mt: 2.5,
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
            })}
          >
            <Typography variant="caption" color="text.secondary">
              You are recording
            </Typography>
            <Typography variant="h6" fontWeight={800} color="primary.main">
              ${amount.toFixed(2)} · {paymentType?.name} · {draft.type}
            </Typography>
            {isSchool && selectedStudent && (
              <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ mt: 0.5 }}>
                {selectedStudent.firstName} {selectedStudent.lastName} ({selectedStudent.studentNumber})
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!canSubmit || loading}
          onClick={onSubmit}
          startIcon={<CheckCircle />}
          size="large"
          sx={{ textTransform: "none", fontWeight: 700, px: 3 }}
        >
          {loading ? "Recording…" : isSchool ? "Record school fee" : "Record payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
