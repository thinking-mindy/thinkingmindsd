"use client";

import { useState } from "react";
import {
  Box,
  Button,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  alpha,
  styled,
} from "@mui/material";
import { BackupOutlined, DownloadOutlined, UploadOutlined } from "@mui/icons-material";
import {
  createMindsBackup,
  parseMindsBackupFile,
  restoreMindsBackupMerge,
  formatRestoreSummary,
  saveMindsBackup,
} from "@/lib/minds-backup";

const StyledCard = styled("div")(({ theme }) => ({
  borderRadius: 20,
  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.06)}`,
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  background: alpha(theme.palette.background.paper, 0.95),
  backdropFilter: "blur(8px)",
}));

type AdminBackupTabProps = {
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
};

export default function AdminBackupTab({ onMessage }: AdminBackupTabProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const backup = await createMindsBackup();
      const stamp = new Date().toISOString().slice(0, 10);
      const { savedAs, usedSavePicker } = await saveMindsBackup(backup, `thinkingminds-${stamp}.minds`);
      const fileCount = Object.keys(backup.server.files ?? {}).length;
      const clientKeys = Object.keys(backup.client.localStorage ?? {}).length;
      onMessage({
        type: "success",
        text: usedSavePicker
          ? `Backup saved to ${savedAs} — ${fileCount} database file(s), ${clientKeys} browser store key(s)`
          : `Backup downloaded as ${savedAs} — ${fileCount} database file(s), ${clientKeys} browser store key(s)`,
      });
    } catch (error) {
      const message = (error as Error).message;
      if (message === "Backup cancelled") return;
      onMessage({ type: "error", text: "Backup failed: " + message });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".minds,application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading(true);
      try {
        const backup = await parseMindsBackupFile(file);
        const summary = await restoreMindsBackupMerge(backup);
        onMessage({
          type: "success",
          text: `Restore complete (existing data kept): ${formatRestoreSummary(summary)}`,
        });
      } catch (error) {
        onMessage({ type: "error", text: "Restore failed: " + (error as Error).message });
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  return (
    <StyledCard>
      <CardContent sx={{ p: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <BackupOutlined color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Backup & Restore
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
          Export or restore a <strong>.minds</strong> archive with all local JSON databases, users,
          offline browser data, and encrypted login secrets. Restore merges only — records that
          already exist are skipped, never overwritten.
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadOutlined />}
            onClick={handleExport}
            disabled={loading}
            fullWidth
          >
            Backup to .minds file
          </Button>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={20} /> : <UploadOutlined />}
            onClick={handleImport}
            disabled={loading}
            fullWidth
          >
            Restore from .minds
          </Button>
        </Stack>

        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.info.main, 0.06),
            border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Tip: run a backup before major updates or when moving data to another machine. In Chrome
            and Edge you can choose the folder and filename in the save dialog.
          </Typography>
        </Box>
      </CardContent>
    </StyledCard>
  );
}
