"use client";

import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import { ArrowForward, CompareArrows, Refresh, Sync } from "@mui/icons-material";
import { formatCurrency } from "@/lib/format-currency";

type Props = {
  opsNet: number;
  glNet: number;
  journalCount: number;
  syncing?: boolean;
  onSync: () => void;
  onRefresh: () => void;
};

export default function FinanceBridgeBar({
  opsNet,
  glNet,
  journalCount,
  syncing,
  onSync,
  onRefresh,
}: Props) {
  const variance = glNet - opsNet;
  const inSync = Math.abs(variance) < 1;

  return (
    <Paper
      variant="outlined"
      sx={(t) => ({
        p: 1.75,
        mb: 2,
        borderRadius: 2,
        bgcolor: alpha(t.palette.primary.main, 0.03),
        borderStyle: "dashed",
      })}
    >
      <Stack direction={{ xs: "column", lg: "row" }} alignItems={{ lg: "center" }} gap={1.5}>
        <Stack direction="row" alignItems="center" gap={1} flexShrink={0}>
          <CompareArrows color="primary" sx={{ fontSize: 18 }} />
          <Typography variant="subtitle2" fontWeight={700}>
            Ops ↔ GL
          </Typography>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          gap={1.5}
          flex={1}
          flexWrap="wrap"
          justifyContent={{ xs: "flex-start", lg: "center" }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Ops net
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {formatCurrency(opsNet)}
            </Typography>
          </Box>
          <ArrowForward sx={{ fontSize: 16, color: "text.disabled" }} />
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              GL net
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {formatCurrency(glNet)}
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" }, my: 0.5 }} />
          <Chip
            size="small"
            label={inSync ? "In sync" : `Δ ${formatCurrency(variance)}`}
            color={inSync ? "success" : "warning"}
            variant="outlined"
          />
          <Chip
            size="small"
            variant="outlined"
            label={journalCount > 0 ? `${journalCount} journals` : "Ledger empty"}
          />
        </Stack>

        <Stack direction="row" gap={1} flexShrink={0}>
          <Button
            size="small"
            startIcon={<Sync />}
            variant="contained"
            onClick={onSync}
            disabled={syncing}
          >
            {syncing ? "Syncing…" : "Sync ops → GL"}
          </Button>
          <Button size="small" startIcon={<Refresh />} variant="outlined" onClick={onRefresh}>
            Refresh
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
