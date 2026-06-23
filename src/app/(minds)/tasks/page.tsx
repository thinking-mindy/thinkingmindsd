"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  AddOutlined,
  AssignmentOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FolderOutlined,
  RefreshOutlined,
  VisibilityOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { useUser } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import {
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getOrgMembersForTasks,
  getProjectsForCurrentOrg,
  getTasksForCurrentOrg,
  getWorkBoardConfig,
  updateProject,
  updateTask,
  type OrgMemberOption,
} from "@/lib/desktop/projects-bridge";
import { DEFAULT_WORK_BOARD_CONFIG, columnLabel, type WorkBoardConfig } from "@/lib/task-board";
import WorkBoardTab from "./components/WorkBoardTab";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartTooltip, Legend);

type ProjectRow = {
  _id?: string;
  projectId?: string;
  name?: string;
  description?: string;
  status?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  createdAt?: string | Date;
};

type TaskRow = {
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
};

const fmtDate = (d?: string | Date) =>
  d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d)) : "—";

function idStr(v?: string | { toString(): string }) {
  return v == null ? "" : String(v);
}

function StatTile({
  label,
  value,
  sub,
  icon,
  color = "#0AA775",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  color?: string;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.5, height: "100%" }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: alpha(color, 0.12),
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function statusChipColor(status?: string): "default" | "info" | "warning" | "success" | "error" | "secondary" {
  switch (status) {
    case "done":
    case "completed":
      return "success";
    case "in_progress":
    case "active":
      return "warning";
    case "review":
    case "planning":
      return "info";
    case "cancelled":
    case "on_hold":
      return "error";
    default:
      return "default";
  }
}

function priorityColor(p?: string) {
  if (p === "high") return "error";
  if (p === "medium") return "warning";
  return "default";
}

export default function TasksPage() {
  const { user } = useUser();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [members, setMembers] = useState<OrgMemberOption[]>([]);
  const [boardConfig, setBoardConfig] = useState<WorkBoardConfig>(DEFAULT_WORK_BOARD_CONFIG);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [projectDialog, setProjectDialog] = useState<"create" | "edit" | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "planning" as ProjectRow["status"],
  });

  const [taskDialog, setTaskDialog] = useState<"create" | "edit" | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [taskForm, setTaskForm] = useState({
    name: "",
    description: "",
    projectId: "",
    assignedTo: "",
    status: "todo" as TaskRow["status"],
    priority: "medium" as TaskRow["priority"],
    dueDate: dayjs().add(7, "day") as Dayjs | null,
  });

  const memberName = useCallback(
    (id?: string) => members.find((m) => m.id === id)?.name || members.find((m) => m.id === id)?.email || "—",
    [members]
  );

  const projectName = useCallback(
    (id?: string) => {
      if (!id) return "—";
      const p = projects.find((x) => idStr(x.projectId) === id || idStr(x._id) === id);
      return p?.name || "—";
    },
    [projects]
  );

  const load = useCallback(async () => {
    if (!user?.publicMetadata?.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pRes, tRes, mRes, boardRes] = await Promise.all([
        getProjectsForCurrentOrg(),
        getTasksForCurrentOrg(),
        getOrgMembersForTasks(),
        getWorkBoardConfig(),
      ]);
      if (pRes.success) setProjects((pRes.data as unknown as ProjectRow[]) || []);
      if (tRes.success) setTasks((tRes.data as unknown as TaskRow[]) || []);
      if (mRes.success) setMembers(mRes.data || []);
      if (boardRes.success && boardRes.data) setBoardConfig(boardRes.data);
    } catch {
      setSnackbar({ open: true, message: "Failed to load projects and tasks", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [user?.publicMetadata?.companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => {
    const now = Date.now();
    const overdue = tasks.filter((t) => {
      if (!t.dueDate || t.status === "done") return false;
      return new Date(t.dueDate).getTime() < now;
    }).length;
    return {
      projects: projects.length,
      activeProjects: projects.filter((p) => p.status === "active").length,
      tasks: tasks.length,
      done: tasks.filter((t) => t.status === "done").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      overdue,
    };
  }, [projects, tasks]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          projectName(t.projectId).toLowerCase().includes(q)
      );
    }
    return list;
  }, [tasks, statusFilter, search, projectName]);

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  const taskStatusChart = useMemo(() => {
    const buckets = boardConfig.taskColumns
      .map((col) => ({
        label: col.label,
        value: tasks.filter((t) => (t.status || "todo") === col.id).length,
        color: col.color,
      }))
      .filter((b) => b.value > 0);
    return {
      labels: buckets.map((b) => b.label),
      datasets: [{ data: buckets.map((b) => b.value), backgroundColor: buckets.map((b) => b.color), borderWidth: 0 }],
    };
  }, [tasks, boardConfig.taskColumns]);

  const projectTaskChart = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      const label = t.projectId ? projectName(t.projectId) : "No project";
      counts[label] = (counts[label] || 0) + 1;
    });
    const rows = Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    return {
      labels: rows.map((r) => r.label),
      datasets: [
        {
          label: "Tasks",
          data: rows.map((r) => r.count),
          backgroundColor: alpha("#0AA775", 0.75),
          borderRadius: 6,
        },
      ],
    };
  }, [tasks, projectName]);

  const resetProjectForm = () =>
    setProjectForm({ name: "", description: "", status: "planning" });

  const resetTaskForm = () =>
    setTaskForm({
      name: "",
      description: "",
      projectId: "",
      assignedTo: "",
      status: "todo",
      priority: "medium",
      dueDate: dayjs().add(7, "day"),
    });

  const saveProject = async () => {
    if (!user?.publicMetadata?.companyId || !projectForm.name.trim()) {
      setSnackbar({ open: true, message: "Project name is required", severity: "error" });
      return;
    }
    const orgId = user.publicMetadata.companyId as string;
    const payload = {
      orgId,
      name: projectForm.name.trim(),
      description: projectForm.description.trim() || undefined,
      status: (projectForm.status || "planning") as "planning" | "active" | "on_hold" | "completed" | "cancelled",
      members: [],
    };

    const res =
      projectDialog === "edit" && selectedProject
        ? await updateProject(idStr(selectedProject.projectId || selectedProject._id), {
            name: payload.name,
            description: payload.description,
            status: payload.status,
          })
        : await createProject(payload as never);

    if (res.success) {
      setSnackbar({
        open: true,
        message: projectDialog === "edit" ? "Project updated" : "Project created",
        severity: "success",
      });
      setProjectDialog(null);
      setSelectedProject(null);
      resetProjectForm();
      load();
    } else {
      setSnackbar({ open: true, message: (res as { error?: string }).error || "Save failed", severity: "error" });
    }
  };

  const saveTask = async () => {
    if (!user?.publicMetadata?.companyId || !taskForm.name.trim()) {
      setSnackbar({ open: true, message: "Task name is required", severity: "error" });
      return;
    }
    const orgId = user.publicMetadata.companyId as string;
    const payload = {
      orgId,
      name: taskForm.name.trim(),
      description: taskForm.description.trim() || taskForm.name.trim(),
      projectId: taskForm.projectId || undefined,
      assignedTo: taskForm.assignedTo || undefined,
      status: (taskForm.status || "todo") as "todo" | "in_progress" | "review" | "done",
      priority: (taskForm.priority || "medium") as "low" | "medium" | "high",
      dueDate: taskForm.dueDate?.toDate(),
    };

    const res =
      taskDialog === "edit" && selectedTask
        ? await updateTask(idStr(selectedTask.taskId || selectedTask._id), payload as never)
        : await createTask(payload as never);

    if (res.success) {
      setSnackbar({
        open: true,
        message: taskDialog === "edit" ? "Task updated" : "Task created",
        severity: "success",
      });
      setTaskDialog(null);
      setSelectedTask(null);
      resetTaskForm();
      load();
    } else {
      setSnackbar({ open: true, message: (res as { error?: string }).error || "Save failed", severity: "error" });
    }
  };

  const removeProject = async (p: ProjectRow) => {
    const res = await deleteProject(idStr(p.projectId || p._id));
    if (res.success) {
      setSnackbar({ open: true, message: "Project deleted", severity: "success" });
      load();
    } else {
      setSnackbar({ open: true, message: "Delete failed", severity: "error" });
    }
  };

  const removeTask = async (t: TaskRow) => {
    const res = await deleteTask(idStr(t.taskId || t._id));
    if (res.success) {
      setSnackbar({ open: true, message: "Task deleted", severity: "success" });
      load();
    } else {
      setSnackbar({ open: true, message: "Delete failed", severity: "error" });
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Task", "Project", "Assignee", "Status", "Priority", "Due"],
      ...filteredTasks.map((t) => [
        t.name || "",
        projectName(t.projectId),
        memberName(t.assignedTo),
        t.status || "",
        t.priority || "",
        t.dueDate ? fmtDate(t.dueDate) : "",
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ width: "100%", py: 3, px: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <Card
            variant="outlined"
            sx={(t) => ({
              borderRadius: 3,
              p: { xs: 2, md: 2.5 },
              borderColor: alpha(t.palette.primary.main, 0.25),
              bgcolor: alpha(t.palette.primary.main, 0.05),
            })}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={2}
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Work management
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  Projects & Tasks
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Plan projects, assign work, and track delivery across your organisation.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadOutlined />}
                  onClick={exportCsv}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Export CSV
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshOutlined />}
                  onClick={load}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Refresh
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FolderOutlined />}
                  onClick={() => {
                    resetProjectForm();
                    setProjectDialog("create");
                  }}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  New project
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddOutlined />}
                  onClick={() => {
                    resetTaskForm();
                    setTaskDialog("create");
                  }}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  New task
                </Button>
              </Stack>
            </Stack>
          </Card>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <StatTile label="Projects" value={String(kpis.projects)} sub={`${kpis.activeProjects} active`} icon={<FolderOutlined sx={{ fontSize: 20 }} />} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <StatTile label="Tasks" value={String(kpis.tasks)} icon={<AssignmentOutlined sx={{ fontSize: 20 }} />} color="#2196f3" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <StatTile label="In progress" value={String(kpis.inProgress)} icon={<AssignmentOutlined sx={{ fontSize: 20 }} />} color="#ff9800" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <StatTile label="Completed" value={String(kpis.done)} icon={<CheckCircleOutlined sx={{ fontSize: 20 }} />} color="#0AA775" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <StatTile label="Overdue" value={String(kpis.overdue)} icon={<WarningAmberOutlined sx={{ fontSize: 20 }} />} color="#f44336" />
            </Grid>
          </Grid>

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 42 } }}
          >
            <Tab label="Overview" />
            <Tab label="Board" />
            <Tab label={`Projects (${projects.length})`} />
            <Tab label={`Tasks (${tasks.length})`} />
          </Tabs>

          {tab === 1 && (
            <WorkBoardTab
              projects={projects}
              tasks={tasks}
              boardConfig={boardConfig}
              onConfigChange={setBoardConfig}
              onReload={load}
              projectName={projectName}
              memberName={memberName}
              onOpenTask={(taskId, defaultStatus) => {
                if (taskId) {
                  router.push(`/tasks/view?id=${taskId}`);
                  return;
                }
                resetTaskForm();
                if (defaultStatus) {
                  setTaskForm((f) => ({ ...f, status: defaultStatus as TaskRow["status"] }));
                }
                setTaskDialog("create");
              }}
              onOpenProject={(p) => {
                setSelectedProject(p);
                setProjectForm({
                  name: p.name || "",
                  description: p.description || "",
                  status: (p.status as ProjectRow["status"]) || "planning",
                });
                setProjectDialog("edit");
              }}
              onCreateProject={(defaultStatus) => {
                resetProjectForm();
                if (defaultStatus) {
                  setProjectForm((f) => ({ ...f, status: defaultStatus as ProjectRow["status"] }));
                }
                setProjectDialog("create");
              }}
              onNotify={(message, severity) => setSnackbar({ open: true, message, severity })}
            />
          )}

          {tab === 0 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Tasks by status
                  </Typography>
                  <Box sx={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {taskStatusChart.labels.length ? (
                      <Doughnut
                        data={taskStatusChart}
                        options={{ plugins: { legend: { position: "bottom" } }, maintainAspectRatio: false }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No tasks yet — create one to get started.
                      </Typography>
                    )}
                  </Box>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Tasks per project
                  </Typography>
                  <Box sx={{ height: 260 }}>
                    {projectTaskChart.labels.length ? (
                      <Bar
                        data={projectTaskChart}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                        }}
                      />
                    ) : (
                      <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                        <Typography variant="body2" color="text.secondary">
                          No task distribution to show.
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </Card>
              </Grid>
            </Grid>
          )}

          {tab === 2 && (
            <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <TextField
                  size="small"
                  placeholder="Search projects…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  fullWidth
                />
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Project</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Tasks</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No projects yet.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((p) => {
                      const pid = idStr(p.projectId || p._id);
                      const taskCount = tasks.filter(
                        (t) => t.projectId && idStr(t.projectId) === pid
                      ).length;
                      return (
                        <TableRow key={pid} hover>
                          <TableCell>
                            <Typography fontWeight={600}>{p.name}</Typography>
                            {p.description && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {p.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip label={p.status || "planning"} size="small" color={statusChipColor(p.status)} variant="outlined" />
                          </TableCell>
                          <TableCell>{taskCount}</TableCell>
                          <TableCell>{fmtDate(p.createdAt)}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedProject(p);
                                    setProjectForm({
                                      name: p.name || "",
                                      description: p.description || "",
                                      status: (p.status as ProjectRow["status"]) || "planning",
                                    });
                                    setProjectDialog("edit");
                                  }}
                                >
                                  <EditOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => removeProject(p)}>
                                  <DeleteOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {tab === 3 && (
            <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    size="small"
                    placeholder="Search tasks or projects…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <MenuItem value="all">All</MenuItem>
                      {boardConfig.taskColumns.map((col) => (
                        <MenuItem key={col.id} value={col.id}>
                          {col.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Task</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Assignee</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No tasks match your filters.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((t) => {
                      const tid = idStr(t.taskId || t._id);
                      const overdue =
                        t.dueDate && t.status !== "done" && new Date(t.dueDate).getTime() < Date.now();
                      return (
                        <TableRow key={tid} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                          <TableCell>{projectName(t.projectId)}</TableCell>
                          <TableCell>{memberName(t.assignedTo)}</TableCell>
                          <TableCell>
                            <Chip label={t.priority || "medium"} size="small" color={priorityColor(t.priority)} variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip label={columnLabel(boardConfig.taskColumns, t.status)} size="small" color={statusChipColor(t.status)} variant="outlined" />
                          </TableCell>
                          <TableCell sx={{ color: overdue ? "error.main" : undefined, fontWeight: overdue ? 600 : 400 }}>
                            {fmtDate(t.dueDate)}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                              <Tooltip title="View">
                                <IconButton size="small" onClick={() => router.push(`/tasks/view?id=${tid}`)}>
                                  <VisibilityOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedTask(t);
                                    setTaskForm({
                                      name: t.name || "",
                                      description: t.description || "",
                                      projectId: t.projectId || "",
                                      assignedTo: t.assignedTo || "",
                                      status: (t.status as TaskRow["status"]) || "todo",
                                      priority: (t.priority as TaskRow["priority"]) || "medium",
                                      dueDate: t.dueDate ? dayjs(t.dueDate) : dayjs().add(7, "day"),
                                    });
                                    setTaskDialog("edit");
                                  }}
                                >
                                  <EditOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => removeTask(t)}>
                                  <DeleteOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </Stack>

        <Dialog open={!!projectDialog} onClose={() => setProjectDialog(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{projectDialog === "edit" ? "Edit project" : "New project"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Name"
                size="small"
                value={projectForm.name}
                onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Description"
                size="small"
                value={projectForm.description}
                onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                rows={2}
                fullWidth
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={projectForm.status || "planning"}
                  onChange={(e: SelectChangeEvent) =>
                    setProjectForm((f) => ({ ...f, status: e.target.value as ProjectRow["status"] }))
                  }
                >
                  {boardConfig.projectColumns.map((col) => (
                    <MenuItem key={col.id} value={col.id}>
                      {col.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setProjectDialog(null)}>Cancel</Button>
            <Button variant="contained" onClick={saveProject}>
              {projectDialog === "edit" ? "Save" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={!!taskDialog} onClose={() => setTaskDialog(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{taskDialog === "edit" ? "Edit task" : "New task"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Name"
                size="small"
                value={taskForm.name}
                onChange={(e) => setTaskForm((f) => ({ ...f, name: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Description"
                size="small"
                value={taskForm.description}
                onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                rows={2}
                fullWidth
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Project</InputLabel>
                <Select
                  label="Project"
                  value={taskForm.projectId}
                  onChange={(e: SelectChangeEvent) => setTaskForm((f) => ({ ...f, projectId: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>No project</em>
                  </MenuItem>
                  {projects.map((p) => {
                    const pid = idStr(p.projectId || p._id);
                    return (
                      <MenuItem key={pid} value={pid}>
                        {p.name}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Assignee</InputLabel>
                <Select
                  label="Assignee"
                  value={taskForm.assignedTo}
                  onChange={(e: SelectChangeEvent) => setTaskForm((f) => ({ ...f, assignedTo: e.target.value }))}
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
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={taskForm.status || "todo"}
                    onChange={(e: SelectChangeEvent) =>
                      setTaskForm((f) => ({ ...f, status: e.target.value as TaskRow["status"] }))
                    }
                  >
                    {boardConfig.taskColumns.map((col) => (
                      <MenuItem key={col.id} value={col.id}>
                        {col.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    label="Priority"
                    value={taskForm.priority || "medium"}
                    onChange={(e: SelectChangeEvent) =>
                      setTaskForm((f) => ({ ...f, priority: e.target.value as TaskRow["priority"] }))
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
                value={taskForm.dueDate}
                onChange={(v) => setTaskForm((f) => ({ ...f, dueDate: v }))}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setTaskDialog(null)}>Cancel</Button>
            <Button variant="contained" onClick={saveTask}>
              {taskDialog === "edit" ? "Save" : "Create"}
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
