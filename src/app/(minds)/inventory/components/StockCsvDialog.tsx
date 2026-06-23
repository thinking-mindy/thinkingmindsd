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
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import { bulkUpsertInventoryItems } from "@/lib/desktop/inventory-bridge";
import {
  downloadStockTemplate,
  parseStockCsv,
  type StockCsvRow,
} from "@/lib/inventory-csv";

export default function StockCsvDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<StockCsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null>(null);

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

  const handleFile = async (file: File) => {
    setResult(null);
    const text = await file.text();
    const { rows: parsed, errors } = parseStockCsv(text);
    setRows(parsed);
    setParseErrors(errors);
    setFileName(file.name);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await bulkUpsertInventoryItems(rows, { updateExisting });
      if (res.success) {
        setResult({
          created: res.created,
          updated: res.updated,
          skipped: res.skipped,
          errors: res.errors,
        });
        onImported?.();
      } else {
        setParseErrors([res.error ?? "Import failed"]);
      }
    } finally {
      setImporting(false);
    }
  };

  const preview = rows.slice(0, 8);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Import stock from CSV</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5}>
          <Alert severity="info" icon={<DescriptionOutlined />}>
            Columns: <strong>sku</strong>, <strong>name</strong>, quantity, location, reorderLevel, price.
            Existing SKUs can be updated or skipped.
          </Alert>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" size="small" onClick={downloadStockTemplate}>
              Download template
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<CloudUploadOutlined />}
              onClick={() => fileRef.current?.click()}
            >
              Choose file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            {fileName && (
              <Chip label={fileName} size="small" onDelete={reset} sx={{ fontWeight: 600 }} />
            )}
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={updateExisting}
                onChange={(_, v) => setUpdateExisting(v)}
              />
            }
            label="Update existing items when SKU matches"
          />

          {parseErrors.length > 0 && (
            <Alert severity="warning">
              {parseErrors.slice(0, 5).map((e, i) => (
                <Typography key={i} variant="body2">
                  {e}
                </Typography>
              ))}
              {parseErrors.length > 5 && (
                <Typography variant="caption">+{parseErrors.length - 5} more</Typography>
              )}
            </Alert>
          )}

          {rows.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Preview ({rows.length} row{rows.length !== 1 ? "s" : ""})
              </Typography>
              <TableContainer sx={{ borderRadius: 2, border: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}` }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {["SKU", "Name", "Qty", "Location", "Reorder", "Price"].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.sku}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.quantity}</TableCell>
                        <TableCell>{r.location ?? "—"}</TableCell>
                        <TableCell>{r.reorderLevel ?? "—"}</TableCell>
                        <TableCell>{r.price ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {rows.length > preview.length && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  Showing first {preview.length} of {rows.length}
                </Typography>
              )}
            </Box>
          )}

          {importing && <LinearProgress />}

          {result && (
            <Alert severity="success">
              Imported: {result.created} created, {result.updated} updated, {result.skipped} skipped.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Close</Button>
        <Button
          variant="contained"
          disabled={rows.length === 0 || importing}
          onClick={() => void handleImport()}
        >
          Import {rows.length > 0 ? rows.length : ""} items
        </Button>
      </DialogActions>
    </Dialog>
  );
}
