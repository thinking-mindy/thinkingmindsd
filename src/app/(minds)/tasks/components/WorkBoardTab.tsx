"use client";

import { useCallback, useMemo, useState } from "react";
import {
  alpha,
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { SettingsOutlined, ViewKanbanOutlined } from "@mui/icons-material";
import KanbanBoard, { type KanbanItem } from "@/components/tasks/KanbanBoard";
import BoardColumnManager from "@/components/tasks/BoardColumnManager";
import {
  columnLabel,
  isDoneColumn,
  columnById,
  type BoardColumn,
  type WorkBoardConfig,
} from "@/lib/task-board";
import {
  migrateProjectStatuses,
  migrateTaskStatuses,
  saveWorkBoardConfig,
  updateProject,
  updateTask,
} from "@/lib/desktop/projects-bridge";

type ProjectRow = {
  _id?: string;
  projectId?: string;
  name?: string;
  description?: string;
  status?: string;
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
};

function idStr(v?: string) {
  return v == null ? "" : String(v);
}

const fmtShort = (d?: string | Date) =>
  d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(d)) : undefined;

type WorkBoardTabProps = {
  projects: ProjectRow[];
  tasks: TaskRow[];
  boardConfig: WorkBoardConfig;
  onConfigChange: (config: WorkBoardConfig) => void;
  onReload: () => void;
  projectName: (id?: string) => string;
  memberName: (id?: string) => string;
  onOpenTask: (taskId: string, defaultStatus?: string) => void;
  onOpenProject: (project: ProjectRow) => void;
  onCreateProject: (defaultStatus?: string) => void;
  onNotify: (message: string, severity: "success" | "error") => void;
};

export default function WorkBoardTab({
  projects,
  tasks,
  boardConfig,
  onConfigChange,
  onReload,
  projectName,
  memberName,
  onOpenTask,
  onOpenProject,
  onCreateProject,
  onNotify,
}: WorkBoardTabProps) {
  const [boardKind, setBoardKind] = useState<"tasks" | "projects">("tasks");
  const [projectFilter, setProjectFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [configOpen, setConfigOpen] = useState(false);

  const columns = boardKind === "tasks" ? boardConfig.taskColumns : boardConfig.projectColumns;

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (projectFilter !== "all") {
      list = list.filter((t) => idStr(t.projectId) === projectFilter);
    }
    if (assigneeFilter !== "all") {
      list = list.filter((t) => t.assignedTo === assigneeFilter);
    }
    return list;
  }, [tasks, projectFilter, assigneeFilter]);

  const taskUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      const s = t.status || "todo";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  const projectUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      const s = p.status || "planning";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const taskKanbanItems: KanbanItem[] = useMemo(
    () =>
      filteredTasks.map((t) => {
        const tid = idStr(t.taskId || t._id);
        const assignee = memberName(t.assignedTo);
        const overdue =
          !!t.dueDate &&
          !isDoneColumn(columnById(boardConfig.taskColumns, t.status)) &&
          new Date(t.dueDate).getTime() < Date.now();
        return {
          id: tid,
          title: t.name || "Untitled",
          subtitle: t.description,
          status: t.status || boardConfig.taskColumns[0]?.id || "todo",
          priority: t.priority,
          assigneeInitial: assignee !== "—" ? assignee.charAt(0).toUpperCase() : undefined,
          dueLabel: fmtShort(t.dueDate),
          overdue,
          meta: t.projectId ? (
            <Chip label={projectName(t.projectId)} size="small" variant="outlined" sx={{ maxWidth: 120 }} />
          ) : undefined,
        };
      }),
    [filteredTasks, boardConfig.taskColumns, memberName, projectName]
  );

  const projectKanbanItems: KanbanItem[] = useMemo(
    () =>
      projects.map((p) => {
        const pid = idStr(p.projectId || p._id);
        const taskCount = tasks.filter((t) => idStr(t.projectId) === pid).length;
        return {
          id: pid,
          title: p.name || "Untitled",
          subtitle: p.description,
          status: p.status || boardConfig.projectColumns[0]?.id || "planning",
          meta: (
            <Chip
              label={`${taskCount} task${taskCount === 1 ? "" : "s"}`}
              size="small"
              variant="outlined"
              color={taskCount > 0 ? "primary" : "default"}
            />
          ),
        };
      }),
    [projects, tasks, boardConfig.projectColumns]
  );

  const handleMoveTask = useCallback(
    async (itemId: string, toStatus: string) => {
      const res = await updateTask(itemId, { status: toStatus });
      if (res.success) onReload();
      else onNotify("Could not move task", "error");
    },
    [onReload, onNotify]
  );

  const handleMoveProject = useCallback(
    async (itemId: string, toStatus: string) => {
      const res = await updateProject(itemId, { status: toStatus });
      if (res.success) onReload();
      else onNotify("Could not move project", "error");
    },
    [onReload, onNotify]
  );

  const handleSaveColumns = useCallback(
    async (cols: BoardColumn[], migrations: { from: string; to: string }[]) => {
      for (const m of migrations) {
        if (boardKind === "tasks") await migrateTaskStatuses(m.from, m.to);
        else await migrateProjectStatuses(m.from, m.to);
      }
      const next: WorkBoardConfig = {
        ...boardConfig,
        ...(boardKind === "tasks" ? { taskColumns: cols } : { projectColumns: cols }),
      };
      const res = await saveWorkBoardConfig(next);
      if (res.success) {
        onConfigChange(next);
        onReload();
        onNotify("Board columns saved", "success");
      } else {
        onNotify("Failed to save columns", "error");
      }
    },
    [boardKind, boardConfig, onConfigChange, onReload, onNotify]
  );

  const assignees = useMemo(() => {
    const ids = new Set(tasks.map((t) => t.assignedTo).filter(Boolean) as string[]);
    return Array.from(ids);
  }, [tasks]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ px: 2, pt: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: (t) => alpha(t.palette.background.default, 0.5) }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <ViewKanbanOutlined color="primary" />
            <Typography variant="subtitle1" fontWeight={800}>
              Kanban boards
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Drag cards between columns · customise statuses like Jira
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SettingsOutlined />}
            onClick={() => setConfigOpen(true)}
            sx={{ textTransform: "none", fontWeight: 600, alignSelf: { xs: "flex-start", md: "center" } }}
          >
            Configure columns
          </Button>
        </Stack>
        <Tabs
          value={boardKind}
          onChange={(_, v) => setBoardKind(v)}
          sx={{ minHeight: 40, "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 40 } }}
        >
          <Tab value="tasks" label={`Task board (${filteredTasks.length})`} />
          <Tab value="projects" label={`Project board (${projects.length})`} />
        </Tabs>
      </Box>

      {boardKind === "tasks" && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ p: 2, pb: 0 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Project</InputLabel>
            <Select
              label="Project"
              value={projectFilter}
              onChange={(e: SelectChangeEvent) => setProjectFilter(e.target.value)}
            >
              <MenuItem value="all">All projects</MenuItem>
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
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Assignee</InputLabel>
            <Select
              label="Assignee"
              value={assigneeFilter}
              onChange={(e: SelectChangeEvent) => setAssigneeFilter(e.target.value)}
            >
              <MenuItem value="all">Everyone</MenuItem>
              {assignees.map((id) => (
                <MenuItem key={id} value={id}>
                  {memberName(id)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}

      <Box sx={{ p: 2 }}>
        <KanbanBoard
          columns={columns}
          items={boardKind === "tasks" ? taskKanbanItems : projectKanbanItems}
          onMove={boardKind === "tasks" ? handleMoveTask : handleMoveProject}
          onAddInColumn={(status) => {
            if (boardKind === "tasks") onOpenTask("", status);
            else onCreateProject(status);
          }}
          onCardClick={(id) => {
            if (boardKind === "tasks") onOpenTask(id);
            else {
              const p = projects.find((x) => idStr(x.projectId || x._id) === id);
              if (p) onOpenProject(p);
            }
          }}
          emptyHint={boardKind === "tasks" ? "Drop tasks here or add one below" : "Drop projects here"}
        />
      </Box>

      <BoardColumnManager
        open={configOpen}
        title={boardKind === "tasks" ? "Task board columns" : "Project board columns"}
        columns={columns}
        usageCounts={boardKind === "tasks" ? taskUsageCounts : projectUsageCounts}
        onClose={() => setConfigOpen(false)}
        onSave={handleSaveColumns}
      />
    </Card>
  );
}

export { columnLabel };
