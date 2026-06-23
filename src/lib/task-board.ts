/** Kanban column definitions shared by tasks & projects boards. */

export type BoardColumnCategory = 'backlog' | 'active' | 'done';

export type BoardColumn = {
  id: string;
  label: string;
  color: string;
  category: BoardColumnCategory;
  wipLimit?: number;
};

export type WorkBoardConfig = {
  taskColumns: BoardColumn[];
  projectColumns: BoardColumn[];
};

export const BOARD_PALETTE = [
  '#64748b',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#0AA775',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
] as const;

export const DEFAULT_TASK_COLUMNS: BoardColumn[] = [
  { id: 'todo', label: 'To do', color: '#64748b', category: 'backlog' },
  { id: 'in_progress', label: 'In progress', color: '#f59e0b', category: 'active' },
  { id: 'review', label: 'Review', color: '#8b5cf6', category: 'active' },
  { id: 'done', label: 'Done', color: '#0AA775', category: 'done' },
];

export const DEFAULT_PROJECT_COLUMNS: BoardColumn[] = [
  { id: 'planning', label: 'Planning', color: '#64748b', category: 'backlog' },
  { id: 'active', label: 'Active', color: '#3b82f6', category: 'active' },
  { id: 'on_hold', label: 'On hold', color: '#f59e0b', category: 'active' },
  { id: 'completed', label: 'Completed', color: '#0AA775', category: 'done' },
  { id: 'cancelled', label: 'Cancelled', color: '#ef4444', category: 'done' },
];

export const DEFAULT_WORK_BOARD_CONFIG: WorkBoardConfig = {
  taskColumns: DEFAULT_TASK_COLUMNS,
  projectColumns: DEFAULT_PROJECT_COLUMNS,
};

export function slugifyColumnId(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  return base || `column_${Date.now().toString(36)}`;
}

export function normalizeWorkBoardConfig(raw?: Partial<WorkBoardConfig> | null): WorkBoardConfig {
  const taskColumns =
    raw?.taskColumns?.length && raw.taskColumns.every((c) => c.id && c.label)
      ? raw.taskColumns
      : DEFAULT_TASK_COLUMNS;
  const projectColumns =
    raw?.projectColumns?.length && raw.projectColumns.every((c) => c.id && c.label)
      ? raw.projectColumns
      : DEFAULT_PROJECT_COLUMNS;
  return { taskColumns, projectColumns };
}

export function columnLabel(columns: BoardColumn[], status?: string): string {
  if (!status) return 'Unknown';
  return columns.find((c) => c.id === status)?.label ?? status.replace(/_/g, ' ');
}

export function columnById(columns: BoardColumn[], id?: string): BoardColumn | undefined {
  if (!id) return undefined;
  return columns.find((c) => c.id === id);
}

export function isDoneColumn(column?: BoardColumn): boolean {
  return column?.category === 'done' || column?.id === 'done' || column?.id === 'completed';
}
