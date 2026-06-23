"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  alpha,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  ArrowBackOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@mui/icons-material";
import { useRouter, useSearchParams } from "next/navigation";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import {
  deleteTask,
  getOrgMembersForTasks,
  getProjectsForCurrentOrg,
  getTask,
  getWorkBoardConfig,
  updateTask,
  type OrgMemberOption,
} from "@/lib/desktop/projects-bridge";
import { DEFAULT_WORK_BOARD_CONFIG, isDoneColumn, columnById, type WorkBoardConfig } from "@/lib/task-board";

type TaskDetail = {
  _id?: string;
  taskId?: string;
  projectId?: string;
  name?: string;
  description?: string;
  assignedTo?: string;
  status?: string;
  priority?: string;
  dueDate?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

const fmtDate = (d?: string | Date) =>
  d
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(d))
    : "—";

function idStr(v?: string | { toString(): string }) {
  return v == null ? "" : String(v);
}

export default function TaskViewPage() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("id");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [members, setMembers] = useState<OrgMemberOption[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [boardConfig, setBoardConfig] = useState<WorkBoardConfig>(DEFAULT_WORK_BOARD_CONFIG);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [form, setForm] = useState({
    name: "",
    description: "",
    projectId: "",
    assignedTo: "",
    status: "todo" as TaskDetail["status"],
    priority: "medium" as TaskDetail["priority"],
    dueDate: null as Dayjs | null,
  });

  const load = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tRes, mRes, pRes, boardRes] = await Promise.all([
        getTask(taskId),
        getOrgMembersForTasks(),
        getProjectsForCurrentOrg(),
        getWorkBoardConfig(),
      ]);
      if (tRes.success && tRes.data) {
        const row = tRes.data as unknown as TaskDetail;
        setTask(row);
        setForm({
          name: row.name || "",
          description: row.description || "",
          projectId: row.projectId || "",
          assignedTo: row.assignedTo || "",
          status: (row.status as TaskDetail["status"]) || "todo",
          priority: (row.priority as TaskDetail["priority"]) || "medium",
          dueDate: row.dueDate ? dayjs(row.dueDate) : null,
        });
      } else {
        setTask(null);
      }
      if (mRes.success) setMembers(mRes.data || []);
      if (pRes.success) {
        const list = ((pRes.data as unknown as { _id?: string; projectId?: string; name?: string }[]) || []).map(
          (p) => ({
            id: idStr(p.projectId || p._id),
            name: p.name || "Untitled",
          })
        );
        setProjects(list);
      }
      if (boardRes.success && boardRes.data) setBoardConfig(boardRes.data);
    } catch {
      setSnackbar({ open: true, message: "Failed to load task", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const assignee = useMemo(
    () => members.find((m) => m.id === task?.assignedTo)?.name || task?.assignedTo || "Unassigned",
    [members, task?.assignedTo]
  );

  const projectLabel = useMemo(
    () => projects.find((p) => p.id === task?.projectId)?.name || "No project",
    [projects, task?.projectId]
  );

  const statusSteps = boardConfig.taskColumns.map((c) => ({ key: c.id, label: c.label }));
  const activeStep = statusSteps.findIndex((s) => s.key === task?.status);

  const setStatus = async (status: string) => {
    if (!taskId) return;
    const res = await updateTask(taskId, { status });
    if (res.success) {
      setSnackbar({ open: true, message: "Status updated", severity: "success" });
      load();
    } else {
      setSnackbar({ open: true, message: "Update failed", severity: "error" });
    }
  };

  const saveEdit = async () => {
    if (!taskId || !form.name.trim()) return;
    const res = await updateTask(taskId, {
      name: form.name.trim(),
      description: form.description.trim() || form.name.trim(),
      projectId: form.projectId || undefined,
      assignedTo: form.assignedTo || undefined,
      status: (form.status || "todo") as "todo" | "in_progress" | "review" | "done",
      priority: (form.priority || "medium") as "low" | "medium" | "high",
      dueDate: form.dueDate?.toDate(),
    } as never);
    if (res.success) {
      setEditOpen(false);
      setSnackbar({ open: true, message: "Task saved", severity: "success" });
      load();
    } else {
      setSnackbar({ open: true, message: "Save failed", severity: "error" });
    }
  };

  const confirmDelete = async () => {
    if (!taskId) return;
    const res = await deleteTask(taskId);
    if (res.success) {
      router.replace("/tasks");
    } else {
      setSnackbar({ open: true, message: "Delete failed", severity: "error" });
    }
    setDeleteOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!task) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          Task not found
        </Typography>
        <Button startIcon={<ArrowBackOutlined />} onClick={() => router.push("/tasks")} sx={{ mt: 2 }}>
          Back to tasks
        </Button>
      </Box>
    );
  }

  const overdue =
    task.dueDate && task.status !== "done" && new Date(task.dueDate).getTime() < Date.now();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ width: "100%", py: 3, px: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              startIcon={<ArrowBackOutlined />}
              onClick={() => router.push("/tasks")}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Tasks
            </Button>
          </Stack>

          <Card
            variant="outlined"
            sx={(t) => ({
              borderRadius: 3,
              p: { xs: 2, md: 2.5 },
              borderColor: alpha(t.palette.primary.main, 0.25),
              bgcolor: alpha(t.palette.primary.main, 0.04),
            })}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "flex-start" }}
              spacing={2}
            >
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                  <Chip label={(task.status || "todo").replace("_", " ")} size="small" color="primary" variant="outlined" />
                  <Chip label={task.priority || "medium"} size="small" variant="outlined" />
                  {overdue && <Chip label="Overdue" size="small" color="error" />}
                </Stack>
                <Typography variant="h4" fontWeight={800}>
                  {task.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                  {task.description || "No description"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<EditOutlined />}
                  onClick={() => setEditOpen(true)}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlined />}
                  onClick={() => setDeleteOpen(true)}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Delete
                </Button>
              </Stack>
            </Stack>
          </Card>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Details
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Project
                      </Typography>
                      <Typography fontWeight={600}>{projectLabel}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Assignee
                      </Typography>
                      <Typography fontWeight={600}>{assignee}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Due date
                      </Typography>
                      <Typography fontWeight={600} color={overdue ? "error.main" : undefined}>
                        {fmtDate(task.dueDate)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Created
                      </Typography>
                      <Typography fontWeight={600}>{fmtDate(task.createdAt)}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Progress
                  </Typography>
                  <Stack spacing={1.5}>
                    {statusSteps.map((step, index) => {
                      const done = activeStep >= index;
                      const current = task.status === step.key;
                      const taskDone = isDoneColumn(columnById(boardConfig.taskColumns, task.status));
                      return (
                        <Stack
                          key={step.key}
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: 1,
                            borderColor: current ? "primary.main" : "divider",
                            bgcolor: current ? (t) => alpha(t.palette.primary.main, 0.06) : "transparent",
                          }}
                        >
                          <CheckCircleOutlined
                            sx={{
                              color: done ? "success.main" : "action.disabled",
                              fontSize: 22,
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={current ? 700 : 500}>{step.label}</Typography>
                          </Box>
                          {!current && !taskDone && (
                            <Button size="small" onClick={() => setStatus(step.key)} sx={{ textTransform: "none" }}>
                              Set
                            </Button>
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>

        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit task</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Name"
                size="small"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Description"
                size="small"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                rows={3}
                fullWidth
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Project</InputLabel>
                <Select
                  label="Project"
                  value={form.projectId}
                  onChange={(e: SelectChangeEvent) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>No project</em>
                  </MenuItem>
                  {projects.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Assignee</InputLabel>
                <Select
                  label="Assignee"
                  value={form.assignedTo}
                  onChange={(e: SelectChangeEvent) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>Unassigned</em>
                  </MenuItem>
                  {members.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction="row" spacing={1.5}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={form.status || "todo"}
                    onChange={(e: SelectChangeEvent) =>
                      setForm((f) => ({ ...f, status: e.target.value as TaskDetail["status"] }))
                    }
                  >
                    {statusSteps.map((s) => (
                      <MenuItem key={s.key} value={s.key}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    label="Priority"
                    value={form.priority || "medium"}
                    onChange={(e: SelectChangeEvent) =>
                      setForm((f) => ({ ...f, priority: e.target.value as TaskDetail["priority"] }))
                    }
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <DatePicker
                label="Due date"
                value={form.dueDate}
                onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={saveEdit}>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>Delete task?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              This will permanently remove &ldquo;{task.name}&rdquo;.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}
