"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { AddOutlined, DragIndicatorOutlined } from "@mui/icons-material";
import type { BoardColumn } from "@/lib/task-board";

export type KanbanItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  priority?: "low" | "medium" | "high" | string;
  assigneeInitial?: string;
  dueLabel?: string;
  overdue?: boolean;
  status: string;
};

type KanbanBoardProps = {
  columns: BoardColumn[];
  items: KanbanItem[];
  onMove: (itemId: string, toStatus: string) => void | Promise<void>;
  onAddInColumn?: (status: string) => void;
  onCardClick?: (itemId: string) => void;
  emptyHint?: string;
};

function priorityStripe(p?: string) {
  if (p === "high") return "#ef4444";
  if (p === "medium") return "#f59e0b";
  if (p === "low") return "#94a3b8";
  return "transparent";
}

export default function KanbanBoard({
  columns,
  items,
  onMove,
  onAddInColumn,
  onCardClick,
  emptyHint = "Drop cards here",
}: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, KanbanItem[]> = {};
    columns.forEach((c) => {
      map[c.id] = [];
    });
    items.forEach((item) => {
      const key = columns.some((c) => c.id === item.status) ? item.status : columns[0]?.id;
      if (key && map[key]) map[key].push(item);
      else if (columns[0]) {
        (map[columns[0].id] ??= []).push(item);
      }
    });
    return map;
  }, [columns, items]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/kanban-item", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, status: string) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/kanban-item");
      setDropTarget(null);
      setDraggingId(null);
      if (!id) return;
      const item = items.find((i) => i.id === id);
      if (item && item.status !== status) await onMove(id, status);
    },
    [items, onMove]
  );

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        overflowX: "auto",
        pb: 1,
        minHeight: 420,
        alignItems: "flex-start",
      }}
    >
      {columns.map((col) => {
        const colItems = grouped[col.id] ?? [];
        const overWip = col.wipLimit != null && colItems.length > col.wipLimit;
        const isTarget = dropTarget === col.id;

        return (
          <Box
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(col.id);
            }}
            onDragLeave={() => setDropTarget((t) => (t === col.id ? null : t))}
            onDrop={(e) => void handleDrop(e, col.id)}
            sx={{
              flex: "0 0 280px",
              maxWidth: 280,
              borderRadius: 2,
              bgcolor: (t) =>
                isTarget ? alpha(t.palette.primary.main, 0.06) : alpha(t.palette.background.default, 0.6),
              border: 1,
              borderColor: isTarget ? "primary.main" : "divider",
              transition: "border-color 0.15s, background-color 0.15s",
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                borderTop: 3,
                borderColor: col.color,
                borderRadius: "8px 8px 0 0",
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                  {col.label}
                </Typography>
                <Chip
                  label={colItems.length}
                  size="small"
                  sx={{
                    height: 22,
                    minWidth: 28,
                    fontWeight: 700,
                    bgcolor: alpha(col.color, 0.15),
                    color: col.color,
                  }}
                />
              </Stack>
              {col.wipLimit != null && (
                <Typography
                  variant="caption"
                  sx={{ color: overWip ? "warning.main" : "text.secondary", fontWeight: overWip ? 700 : 400 }}
                >
                  WIP {colItems.length}/{col.wipLimit}
                </Typography>
              )}
            </Box>

            <Stack spacing={1} sx={{ p: 1, minHeight: 120 }}>
              {colItems.length === 0 && (
                <Box
                  sx={{
                    py: 4,
                    px: 1,
                    textAlign: "center",
                    borderRadius: 1.5,
                    border: "1px dashed",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {emptyHint}
                  </Typography>
                </Box>
              )}
              {colItems.map((item) => (
                <Box
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onCardClick?.(item.id)}
                  sx={{
                    position: "relative",
                    borderRadius: 1.5,
                    border: 1,
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    cursor: onCardClick ? "pointer" : "grab",
                    opacity: draggingId === item.id ? 0.45 : 1,
                    transition: "box-shadow 0.15s, opacity 0.15s",
                    "&:hover": {
                      boxShadow: 2,
                      borderColor: alpha(col.color, 0.5),
                    },
                    borderLeft: `3px solid ${priorityStripe(item.priority)}`,
                  }}
                >
                  <Stack direction="row" spacing={0.5} sx={{ p: 1.25, pb: 0.5 }}>
                    <DragIndicatorOutlined sx={{ fontSize: 16, color: "text.disabled", mt: 0.25 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.35 }}>
                        {item.title}
                      </Typography>
                      {item.subtitle && (
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {item.subtitle}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                  {(item.meta || item.assigneeInitial || item.dueLabel) && (
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ px: 1.25, pb: 1.25, pt: 0.25 }}
                      spacing={0.5}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>{item.meta}</Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {item.dueLabel && (
                          <Typography
                            variant="caption"
                            sx={{ color: item.overdue ? "error.main" : "text.secondary", fontWeight: item.overdue ? 700 : 400 }}
                          >
                            {item.dueLabel}
                          </Typography>
                        )}
                        {item.assigneeInitial && (
                          <Tooltip title="Assignee">
                            <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: alpha(col.color, 0.2), color: col.color }}>
                              {item.assigneeInitial}
                            </Avatar>
                          </Tooltip>
                        )}
                      </Stack>
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>

            {onAddInColumn && (
              <Box sx={{ px: 1, pb: 1 }}>
                <Button
                  fullWidth
                  size="small"
                  startIcon={<AddOutlined />}
                  onClick={() => onAddInColumn(col.id)}
                  sx={{ textTransform: "none", fontWeight: 600, justifyContent: "flex-start", color: "text.secondary" }}
                >
                  Add item
                </Button>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
