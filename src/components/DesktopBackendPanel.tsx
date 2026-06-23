"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { Memory, Storage } from "@mui/icons-material";
import { isTauriBackendAvailable } from "@/lib/desktop/runtime";
import {
  tauriGetAppPaths,
  tauriHealthCheck,
  tauriListDbCollections,
} from "@/lib/desktop/api";
import type { TauriAppPaths, TauriCollectionMeta, TauriHealthResponse } from "@/lib/desktop/types";

export default function DesktopBackendPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<TauriHealthResponse | null>(null);
  const [paths, setPaths] = useState<TauriAppPaths | null>(null);
  const [collections, setCollections] = useState<TauriCollectionMeta[]>([]);

  const load = useCallback(async () => {
    if (!isTauriBackendAvailable()) return;
    setLoading(true);
    setError(null);
    try {
      const [h, p, cols] = await Promise.all([
        tauriHealthCheck(),
        tauriGetAppPaths(),
        tauriListDbCollections(),
      ]);
      setHealth(h);
      setPaths(p);
      setCollections(cols);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reach Tauri backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isTauriBackendAvailable()) {
    return null;
  }

  const existingCollections = collections.filter((c) => c.exists);

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Memory color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Rust desktop backend
            </Typography>
            <Chip size="small" label="Phase 2 — Admin" color="info" variant="outlined" />
          </Box>

          <Typography variant="body2" color="text.secondary">
            Local database, auth, and admin panel data run in Tauri (Rust). Payments and
            licence sync still use the Next server until later phases.
          </Typography>

          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Checking backend…</Typography>
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {health && (
            <Alert severity="success">
              Backend {health.backend} v{health.version} — OK
            </Alert>
          )}

          {paths && (
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Storage fontSize="small" /> Data paths
              </Typography>
              <Typography variant="caption" component="div" color="text.secondary">
                Root: {paths.data_root}
              </Typography>
              <Typography variant="caption" component="div" color="text.secondary">
                DB: {paths.db_dir}
              </Typography>
              <Typography variant="caption" component="div" color="text.secondary">
                Secrets: {paths.secrets_dir}
              </Typography>
            </Stack>
          )}

          {existingCollections.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {existingCollections.length} collection file(s) on disk (
              {existingCollections.reduce((n, c) => n + c.doc_count, 0)} documents)
            </Typography>
          )}

          <Button variant="outlined" size="small" onClick={() => void load()} disabled={loading}>
            Refresh backend status
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
