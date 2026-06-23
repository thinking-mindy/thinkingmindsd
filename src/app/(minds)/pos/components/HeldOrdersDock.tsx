"use client";

import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import PauseCircleOutline from "@mui/icons-material/PauseCircleOutline";
import PlayArrowOutlined from "@mui/icons-material/PlayArrowOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import type { HeldOrder } from "../types";

import { POS_VAT_RATE } from "@/lib/pos-tax";

const TAX_RATE = POS_VAT_RATE;

function summarize(order: HeldOrder) {
  const entries = Object.values(order.cart);
  const subtotal = entries.reduce((s, e) => s + e.item.price * e.qty, 0);
  const tax = order.taxEnabled ? subtotal * TAX_RATE : 0;
  const itemCount = entries.reduce((s, e) => s + e.qty, 0);
  return { itemCount, total: subtotal + tax };
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function HeldOrdersDock({
  orders,
  expanded,
  onToggleExpand,
  onActivate,
  onDelete,
}: {
  orders: HeldOrder[];
  expanded: boolean;
  onToggleExpand: () => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();
  if (orders.length === 0) return null;

  return (
    <Box
      sx={{
        mb: 1.5,
        flexShrink: 0,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
        bgcolor: alpha(theme.palette.warning.main, 0.06),
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 1.25, py: 0.75, cursor: "pointer" }}
        onClick={onToggleExpand}
      >
        <PauseCircleOutline sx={{ fontSize: 18, color: "warning.dark" }} />
        <Typography variant="caption" fontWeight={700} sx={{ flex: 1, color: "warning.dark" }}>
          Parked orders
        </Typography>
        <Chip label={orders.length} size="small" color="warning" sx={{ height: 20, fontWeight: 700 }} />
        <IconButton size="small" sx={{ p: 0.25 }} aria-label={expanded ? "Collapse" : "Expand"}>
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Stack>

      <Collapse in={expanded}>
        <Stack spacing={0.75} sx={{ px: 1.25, pb: 1.25, maxHeight: 160, overflowY: "auto" }}>
          {orders.map((order) => {
            const { itemCount, total } = summarize(order);
            return (
              <Box
                key={order.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.background.paper, 0.9),
                  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: theme.palette.warning.main,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.15)}`,
                  },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => onActivate(order.id)} role="button">
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {order.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {itemCount} item{itemCount !== 1 ? "s" : ""} · ${total.toFixed(2)} · {timeAgo(order.heldAt)}
                  </Typography>
                </Box>
                <Tooltip title="Resume order">
                  <IconButton
                    size="small"
                    color="warning"
                    onClick={() => onActivate(order.id)}
                    sx={{ bgcolor: alpha(theme.palette.warning.main, 0.12) }}
                  >
                    <PlayArrowOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Discard parked order">
                  <IconButton size="small" color="error" onClick={() => onDelete(order.id)}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
}
