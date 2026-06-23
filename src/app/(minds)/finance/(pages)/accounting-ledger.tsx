"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Collapse,
  IconButton,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { formatCurrency } from "@/lib/format-currency";

export type LedgerView = "overview" | "journal" | "coa" | "reconcile";

type Props = {
  view: LedgerView;
  statements: any;
  trialBalance: any[];
  journals: any[];
  coa: any[];
  onReconcile: (cash: number, bank: number, notes: string) => Promise<void>;
};

export default function LedgerAccountingPanel({
  view,
  statements,
  trialBalance,
  journals,
  coa,
  onReconcile,
}: Props) {
  const [expandedJournal, setExpandedJournal] = useState<string | null>(null);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [countedCash, setCountedCash] = useState("");
  const [countedBank, setCountedBank] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");

  const glNet = statements?.incomeStatement?.netIncome ?? 0;

  const handleReconcile = async () => {
    await onReconcile(Number(countedCash) || 0, Number(countedBank) || 0, reconcileNotes);
    setReconcileOpen(false);
  };

  if (view === "overview") {
    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Income statement
          </Typography>
          <Table size="small">
            <TableBody>
              {(statements?.incomeStatement?.lines ?? []).slice(0, 16).map((row: any, i: number) => (
                <TableRow key={`${row.code}-${i}`}>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {row.code}
                    </Typography>
                    <Typography variant="body2">{row.name}</Typography>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(row.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Net income</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatCurrency(glNet)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Trial balance
          </Typography>
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Credit</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trialBalance.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell>
                      <Typography variant="body2">{row.code}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(row.debit)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.credit)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.balance)}</TableCell>
                  </TableRow>
                ))}
                {!trialBalance.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                      No posted balances yet. Use Sync ops → GL in the bridge bar above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Balance sheet summary
          </Typography>
          <Stack direction="row" gap={3} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">
                Assets
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {formatCurrency(statements?.balanceSheet?.assets ?? 0)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Liabilities
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {formatCurrency(statements?.balanceSheet?.liabilities ?? 0)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Equity
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {formatCurrency(statements?.balanceSheet?.equity ?? 0)}
              </Typography>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    );
  }

  if (view === "journal") {
    return (
      <Stack gap={0.5}>
        {journals.map((j) => {
          const key = String(j._id ?? j.sourceRef);
          const open = expandedJournal === key;
          return (
            <Paper key={key} variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
              <Stack
                direction="row"
                alignItems="center"
                gap={1}
                sx={{ px: 1.5, py: 1, cursor: "pointer" }}
                onClick={() => setExpandedJournal(open ? null : key)}
              >
                <IconButton size="small" sx={{ transform: open ? "rotate(180deg)" : "none" }}>
                  <ExpandMore fontSize="small" />
                </IconButton>
                <Typography variant="body2" sx={{ minWidth: 88 }}>
                  {new Date(j.postedAt ?? j.date).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" fontWeight={600} flex={1} noWrap>
                  {j.memo}
                </Typography>
                <Chip size="small" label={j.sourceType} variant="outlined" />
              </Stack>
              <Collapse in={open}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Account</TableCell>
                      <TableCell align="right">Debit</TableCell>
                      <TableCell align="right">Credit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(j.lines ?? []).map((ln: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>
                          {ln.accountCode} — {ln.accountName}
                        </TableCell>
                        <TableCell align="right">{ln.debit ? formatCurrency(ln.debit) : "—"}</TableCell>
                        <TableCell align="right">{ln.credit ? formatCurrency(ln.credit) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Collapse>
            </Paper>
          );
        })}
        {!journals.length && (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            No journal entries yet. Record activity under Operations, then Sync ops → GL.
          </Typography>
        )}
      </Stack>
    );
  }

  if (view === "coa") {
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coa.map((a) => (
              <TableRow key={a.code}>
                <TableCell sx={{ fontFamily: "monospace" }}>{a.code}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>{a.type}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={a.enabled ? "Active" : "Disabled"}
                    color={a.enabled ? "success" : "default"}
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <>
      <Stack gap={2} maxWidth={480}>
        <Typography variant="body2" color="text.secondary">
          Count physical cash and verify your bank statement. Variances post as adjusting journal entries to Cash/Bank
          and offset accounts.
        </Typography>
        <Button variant="contained" onClick={() => setReconcileOpen(true)}>
          Start reconciliation
        </Button>
      </Stack>

      <Dialog open={reconcileOpen} onClose={() => setReconcileOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cash &amp; bank reconciliation</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <TextField
              label="Counted cash on hand"
              type="number"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              fullWidth
            />
            <TextField
              label="Bank statement balance"
              type="number"
              value={countedBank}
              onChange={(e) => setCountedBank(e.target.value)}
              fullWidth
            />
            <TextField
              label="Notes"
              value={reconcileNotes}
              onChange={(e) => setReconcileNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReconcileOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleReconcile()}>
            Post adjustments
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
