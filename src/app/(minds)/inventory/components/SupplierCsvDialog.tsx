"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
} from "@mui/material";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import { bulkUpsertSuppliers } from "@/lib/desktop/inventory-bridge";
import {
  downloadSupplierTemplate,
  parseSupplierCsv,
  type SupplierCsvRow,
} from "@/lib/supplier-csv";

export default function SupplierCsvDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<SupplierCsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);

  const reset = () => {
    setRows([]);
    setParseErrors([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    try {
      const res = await bulkUpsertSuppliers(rows, { updateExisting });
      if (res.success) {
        setResult({ created: res.created, updated: res.updated, skipped: res.skipped });
        onImported?.();
      } else {
        setParseErrors([res.error ?? "Import failed"]);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Import suppliers from CSV</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="info">
            Required column: <strong>name</strong>. Optional: email, phone, address, city, status, etc.
          </Alert>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" size="small" onClick={downloadSupplierTemplate}>
              Template
            </Button>
            <Button variant="contained" size="small" startIcon={<CloudUploadOutlined />} onClick={() => fileRef.current?.click()}>
              Choose file
            </Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              void f.text().then((text) => {
                const { rows: parsed, errors } = parseSupplierCsv(text);
                setRows(parsed);
                setParseErrors(errors);
                setFileName(f.name);
                setResult(null);
              });
            }} />
            {fileName && <Chip label={fileName} size="small" onDelete={reset} />}
          </Stack>
          <FormControlLabel
            control={<Switch checked={updateExisting} onChange={(_, v) => setUpdateExisting(v)} />}
            label="Update existing suppliers when name matches"
          />
          {parseErrors.length > 0 && (
            <Alert severity="warning">{parseErrors.slice(0, 3).join(" · ")}</Alert>
          )}
          {rows.length > 0 && (
            <TableContainer sx={{ borderRadius: 2, border: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {["Name", "Email", "Phone", "City", "Status"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.slice(0, 6).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.contactEmail ?? "—"}</TableCell>
                      <TableCell>{r.contactPhone ?? "—"}</TableCell>
                      <TableCell>{r.city ?? "—"}</TableCell>
                      <TableCell>{r.status ?? "active"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {importing && <LinearProgress />}
          {result && (
            <Alert severity="success">
              {result.created} created, {result.updated} updated, {result.skipped} skipped.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button variant="contained" disabled={!rows.length || importing} onClick={() => void handleImport()}>
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}
