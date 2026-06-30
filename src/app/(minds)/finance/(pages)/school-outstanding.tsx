"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
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
import { Refresh, Search, WarningAmberOutlined } from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getSchoolStudentsWithBalances } from "@/lib/desktop/school-bridge";
import { formatCurrency } from "@/lib/format-currency";
import { FlatCard } from "@/components/FlatCard";
import { mapStudentBalances, summarizeOutstanding } from "@/lib/school-finance";

export default function SchoolOutstandingTab() {
  const { user } = useUser();
  const orgId = user?.publicMetadata?.companyId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [balances, setBalances] = useState<ReturnType<typeof mapStudentBalances>>([]);

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (!orgId) {
        setLoading(false);
        return;
      }
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await getSchoolStudentsWithBalances(orgId);
        if (res.success && res.data) {
          setBalances(mapStudentBalances(res.data as Record<string, unknown>[]));
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

  const summary = useMemo(() => summarizeOutstanding(balances), [balances]);

  const filtered = useMemo(() => {
    const outstanding = balances.filter((row) => row.remaining > 0);
    if (!search.trim()) return outstanding.sort((a, b) => b.remaining - a.remaining);
    const q = search.toLowerCase();
    return outstanding
      .filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.studentNumber?.toLowerCase().includes(q) ||
          row.className?.toLowerCase().includes(q) ||
          row.termLabel?.toLowerCase().includes(q)
      )
      .sort((a, b) => b.remaining - a.remaining);
  }, [balances, search]);

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
            Outstanding term fees
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Students with unpaid class fees for the current term — collect via Cashier.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={() => void loadData(true)} disabled={refreshing}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <FlatCard sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Total outstanding
            </Typography>
            <Typography variant="h5" fontWeight={800} color="warning.main">
              {formatCurrency(summary.totalDue)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {summary.outstandingCount} students with balance due
            </Typography>
          </CardContent>
        </FlatCard>
        <FlatCard sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Term fees billed
            </Typography>
            <Typography variant="h5" fontWeight={800}>
              {formatCurrency(summary.totalBilled)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Across all enrolled classes
            </Typography>
          </CardContent>
        </FlatCard>
        <FlatCard sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Collected this term
            </Typography>
            <Typography variant="h5" fontWeight={800} color="success.main">
              {formatCurrency(summary.totalPaid)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {summary.collectionRate.toFixed(0)}% collection rate
            </Typography>
          </CardContent>
        </FlatCard>
      </Stack>

      <FlatCard>
        <CardContent sx={{ p: 3 }}>
          <TextField
            size="small"
            placeholder="Search student, class, term…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: "text.secondary", fontSize: 20 }} />,
            }}
            sx={{ mb: 2, maxWidth: 360 }}
          />

          <TableContainer sx={{ borderRadius: 2, border: 1, borderColor: "divider" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.divider, 0.06) }}>
                  <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Term</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Progress</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Term fee
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Paid
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Balance
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Stack spacing={1} alignItems="center">
                        <WarningAmberOutlined sx={{ fontSize: 40, color: "success.main", opacity: 0.5 }} />
                        <Typography fontWeight={700} color="text.secondary">
                          {search ? "No matching outstanding balances" : "All term fees collected"}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {row.name}
                        </Typography>
                        {row.studentNumber && (
                          <Chip
                            label={row.studentNumber}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5, height: 22, fontFamily: "monospace", fontSize: "0.7rem" }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{row.className || "—"}</TableCell>
                      <TableCell>{row.termLabel || "Current term"}</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <LinearProgress
                          variant="determinate"
                          value={row.percentPaid}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            mb: 0.5,
                            bgcolor: alpha("#1976d2", 0.12),
                            "& .MuiLinearProgress-bar": { borderRadius: 3 },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {row.percentPaid.toFixed(0)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(row.feesPerTerm)}</TableCell>
                      <TableCell align="right" sx={{ color: "success.main", fontWeight: 700 }}>
                        {formatCurrency(row.paidThisTerm)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={800} color="warning.main">
                          {formatCurrency(row.remaining)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </FlatCard>
    </Box>
  );
}
