"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  alpha,
} from "@mui/material";
import PeopleAltOutlined from "@mui/icons-material/PeopleAltOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import { getPOSRegisterActivity } from "@/lib/desktop/pos-bridge";

export default function RegisterDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getPOSRegisterActivity(100)
      .then((res) => {
        if (res.success && res.data) setActivity(res.data);
        else setActivity([]);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const whoWentIn = React.useMemo(() => {
    const byName: Record<string, { sales: number; completed: number }> = {};
    activity.forEach((o: any) => {
      const creator = o.createdByName || "—";
      const completer = o.completedByName || "—";
      if (!byName[creator]) byName[creator] = { sales: 0, completed: 0 };
      byName[creator].sales += 1;
      if (o.status === "completed") {
        if (!byName[completer]) byName[completer] = { sales: 0, completed: 0 };
        byName[completer].completed += 1;
      }
    });
    return Object.entries(byName).map(([name, v]) => ({ name, ...v }));
  }, [activity]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          POS Register
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Who went in and who got what
        </Typography>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <PeopleAltOutlined fontSize="small" />
                Who went in
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {whoWentIn.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No activity yet</Typography>
                ) : (
                  whoWentIn.map(({ name, sales, completed }) => (
                    <Chip
                      key={name}
                      label={`${name}: ${completed} completed`}
                      size="small"
                      sx={{
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                        fontWeight: 600,
                      }}
                    />
                  ))
                )}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <ReceiptLongOutlined fontSize="small" />
                Who got what
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Order</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Sold by</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Completed by</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activity.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3 }} color="text.secondary">
                          No orders
                        </TableCell>
                      </TableRow>
                    ) : (
                      activity.map((o: any) => (
                        <TableRow key={o._id || o.orderId}>
                          <TableCell>{o.orderId || o._id}</TableCell>
                          <TableCell>
                            {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell>{o.createdByName ?? "—"}</TableCell>
                          <TableCell>{o.completedByName ?? "—"}</TableCell>
                          <TableCell align="right">${Number(o.total || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
