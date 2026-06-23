"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AddOutlined, ArrowDownwardOutlined, ArrowUpwardOutlined, DeleteOutlined } from "@mui/icons-material";
import {
  BOARD_PALETTE,
  slugifyColumnId,
  type BoardColumn,
  type BoardColumnCategory,
} from "@/lib/task-board";

type BoardColumnManagerProps = {
  open: boolean;
  title: string;
  columns: BoardColumn[];
  onClose: () => void;
  onSave: (columns: BoardColumn[], migrations: { from: string; to: string }[]) => void | Promise<void>;
  usageCounts: Record<string, number>;
};

export default function BoardColumnManager({
  open,
  title,
  columns: initial,
  onClose,
  onSave,
  usageCounts,
}: BoardColumnManagerProps) {
  const [columns, setColumns] = useState<BoardColumn[]>(initial);
  const [newLabel, setNewLabel] = useState("");
  const [migrateFrom, setMigrateFrom] = useState<string | null>(null);
  const [migrateTo, setMigrateTo] = useState("");
  const [migrations, setMigrations] = useState<{ from: string; to: string }[]>([]);

  const reset = () => {
    setColumns(initial);
    setNewLabel("");
    setMigrateFrom(null);
    setMigrateTo("");
    setMigrations([]);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...columns];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setColumns(next);
  };

  const addColumn = () => {
    const label = newLabel.trim();
    if (!label) return;
    let id = slugifyColumnId(label);
    if (columns.some((c) => c.id === id)) id = `${id}_${Date.now().toString(36).slice(-4)}`;
    const color = BOARD_PALETTE[columns.length % BOARD_PALETTE.length];
    setColumns((prev) => [...prev, { id, label, color, category: "active" }]);
    setNewLabel("");
  };

  const removeColumn = (col: BoardColumn) => {
    const count = usageCounts[col.id] ?? 0;
    if (count > 0) {
      setMigrateFrom(col.id);
      setMigrateTo(columns.find((c) => c.id !== col.id)?.id ?? "");
      return;
    }
    setColumns((prev) => prev.filter((c) => c.id !== col.id));
  };

  const confirmMigrateRemove = () => {
    if (!migrateFrom || !migrateTo) return;
    setMigrations((prev) => [...prev, { from: migrateFrom, to: migrateTo }]);
    setColumns((prev) => prev.filter((c) => c.id !== migrateFrom));
    setMigrateFrom(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Drag cards on the board use these column IDs as status values. Reorder columns to match your workflow.
        </Typography>

        <Stack spacing={1.5}>
          {columns.map((col, idx) => (
            <Stack
              key={col.id}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                border: 1,
                borderColor: "divider",
                borderLeft: `4px solid ${col.color}`,
              }}
            >
              <Stack spacing={0.25}>
                <IconButton size="small" disabled={idx === 0} onClick={() => move(idx, -1)}>
                  <ArrowUpwardOutlined fontSize="small" />
                </IconButton>
                <IconButton size="small" disabled={idx === columns.length - 1} onClick={() => move(idx, 1)}>
                  <ArrowDownwardOutlined fontSize="small" />
                </IconButton>
              </Stack>
              <TextField
                size="small"
                label="Name"
                value={col.label}
                onChange={(e) =>
                  setColumns((prev) =>
                    prev.map((c, i) => (i === idx ? { ...c, label: e.target.value } : c))
                  )
                }
                sx={{ flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={col.category}
                  onChange={(e) =>
                    setColumns((prev) =>
                      prev.map((c, i) =>
                        i === idx ? { ...c, category: e.target.value as BoardColumnCategory } : c
                      )
                    )
                  }
                >
                  <MenuItem value="backlog">Backlog</MenuItem>
                  <MenuItem value="active">In flight</MenuItem>
                  <MenuItem value="done">Done</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="WIP"
                type="number"
                value={col.wipLimit ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? undefined : Number(e.target.value);
                  setColumns((prev) =>
                    prev.map((c, i) => (i === idx ? { ...c, wipLimit: v } : c))
                  );
                }}
                sx={{ width: 72 }}
                inputProps={{ min: 1 }}
              />
              <Stack direction="row" spacing={0.25}>
                {BOARD_PALETTE.map((color) => (
                  <Box
                    key={color}
                    onClick={() =>
                      setColumns((prev) => prev.map((c, i) => (i === idx ? { ...c, color } : c)))
                    }
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      bgcolor: color,
                      cursor: "pointer",
                      outline: col.color === color ? "2px solid" : "none",
                      outlineColor: "text.primary",
                    }}
                  />
                ))}
              </Stack>
              <IconButton
                size="small"
                color="error"
                onClick={() => removeColumn(col)}
                disabled={columns.length <= 1}
              >
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <TextField
            size="small"
            placeholder="New column name…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addColumn()}
            sx={{ flex: 1 }}
          />
          <Button variant="outlined" startIcon={<AddOutlined />} onClick={addColumn} sx={{ textTransform: "none" }}>
            Add
          </Button>
        </Stack>

        {migrateFrom && (
          <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Move {usageCounts[migrateFrom] ?? 0} item(s) before deleting this column
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Move to</InputLabel>
                <Select label="Move to" value={migrateTo} onChange={(e) => setMigrateTo(e.target.value)}>
                  {columns
                    .filter((c) => c.id !== migrateFrom)
                    .map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Button variant="contained" onClick={confirmMigrateRemove} sx={{ textTransform: "none" }}>
                Confirm
              </Button>
              <Button onClick={() => setMigrateFrom(null)}>Cancel</Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            void onSave(columns, migrations);
            onClose();
          }}
        >
          Save columns
        </Button>
      </DialogActions>
    </Dialog>
  );
}
