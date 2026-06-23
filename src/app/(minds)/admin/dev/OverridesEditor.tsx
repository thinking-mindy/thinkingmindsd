'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import FormatAlignLeftOutlinedIcon from '@mui/icons-material/FormatAlignLeftOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SplitscreenRoundedIcon from '@mui/icons-material/SplitscreenRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Editor from '@monaco-editor/react';
import { deleteOverrideFile, getOverrideFile, listOverrideFiles, upsertOverrideFile } from '@/lib/desktop/overrides-bridge';
import { runCompanyShellCommand } from '@/lib/desktop/overrides-bridge';
import { inferContentType } from '@/lib/overrides-utils';

type FileRow = { id: string; path: string; updatedAt: string; contentType: string };

type TreeNode = {
  name: string;
  path: string;
  isFile: boolean;
  children: Map<string, TreeNode>;
};

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: '/', children: new Map<string, TreeNode>(), path: '', isFile: false };
  for (const full of paths) {
    const parts = full.split('/').filter(Boolean);
    let node = root;
    let prefix = '';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      prefix = prefix ? `${prefix}/${p}` : p;
      if (!node.children.has(p)) {
        node.children.set(p, { name: p, children: new Map<string, TreeNode>(), path: prefix, isFile: i === parts.length - 1 });
      }
      node = node.children.get(p)!;
      node.isFile = i === parts.length - 1;
    }
  }
  return root;
}

function renderTree(node: TreeNode) {
  const entries = Array.from(node.children.values()).sort((a: TreeNode, b: TreeNode) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  return entries.map((child) => (
    <TreeItem key={child.path} itemId={child.path} label={child.name}>
      {child.children.size > 0 ? renderTree(child) : null}
    </TreeItem>
  ));
}

const DEFAULT_STARTER_FILES: Array<{ path: string; content: string }> = [
  {
    path: 'ui/theme.json',
    content: JSON.stringify(
      {
        brand: { name: 'Thinking Minds', logoUrl: '/logo.png' },
        palette: { primary: '#0AA775', secondary: '#1976d2' },
        shape: { borderRadius: 12 },
        typography: { fontFamily: 'Inter, system-ui, sans-serif' },
      },
      null,
      2,
    ),
  },
  {
    path: 'ui/navigation.json',
    content: JSON.stringify(
      {
        sections: [
          {
            id: 'system',
            title: 'System',
            items: [{ id: 'dev', title: 'Developer Overrides', path: '/admin/dev', enabled: true }],
          },
        ],
      },
      null,
      2,
    ),
  },
  {
    path: 'ui/dashboard.layout.json',
    content: JSON.stringify({ cards: { stats: true, quickNavigation: true, topRef: true } }, null, 2),
  },
  {
    path: 'templates/invoice.hbs',
    content: [
      '<h1>Invoice {{invoice.number}}</h1>',
      '<p>Customer: {{customer.name}}</p>',
      '<p>Total: {{invoice.total}}</p>',
      '',
    ].join('\n'),
  },
  {
    path: 'templates/email/welcome.hbs',
    content: [
      '<h2>Welcome {{user.firstName}}</h2>',
      '<p>Thanks for joining {{company.name}}.</p>',
      '',
    ].join('\n'),
  },
  {
    path: 'workflows/approvals.json',
    content: JSON.stringify(
      {
        invoiceApproval: {
          rules: [{ id: 'highAmount', when: { gt: ['amount', 5000] }, requireRole: 'FinanceManager' }],
        },
      },
      null,
      2,
    ),
  },
];

export default function OverridesEditor() {
  const [files, setFiles] = React.useState<FileRow[]>([]);
  const [selectedPath, setSelectedPath] = React.useState<string>('ui/theme.json');
  const [openTabs, setOpenTabs] = React.useState<string[]>(['ui/theme.json']);
  const [activeTab, setActiveTab] = React.useState<string>('ui/theme.json');
  const [tabContent, setTabContent] = React.useState<Record<string, string>>({});
  const [tabContentType, setTabContentType] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createPath, setCreatePath] = React.useState('ui/new-file.json');
  const [shellDockOpen, setShellDockOpen] = React.useState(true);
  const [shellDockHeight, setShellDockHeight] = React.useState(220);
  const [shellCmd, setShellCmd] = React.useState('ls');
  const [shellOut, setShellOut] = React.useState<string>('');
  const [shellRunning, setShellRunning] = React.useState(false);
  const [shellHistory, setShellHistory] = React.useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1);
  const [fileQuery, setFileQuery] = React.useState('');
  const [splitView, setSplitView] = React.useState(false);
  const [splitTab, setSplitTab] = React.useState('');
  const [toast, setToast] = React.useState<{ open: boolean; severity: 'success' | 'error' | 'info'; message: string }>({
    open: false,
    severity: 'info',
    message: '',
  });

  const dirtyTabs = React.useRef<Set<string>>(new Set());

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await listOverrideFiles();
      if (!res.success) throw new Error(res.error);
      setFiles(res.files);
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Failed to load files' });
    } finally {
      setLoading(false);
    }
  }, []);

  const openFile = React.useCallback(async (path: string) => {
    setLoading(true);
    try {
      const res = await getOverrideFile(path);
      if (!res.success) throw new Error(res.error);
      const file = res.file;
      setSelectedPath(path);
      setActiveTab(path);
      setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
      setTabContent((prev) => ({ ...prev, [path]: file?.content ?? getStarterContent(path) }));
      setTabContentType((prev) => ({ ...prev, [path]: file?.contentType ?? inferContentType(path) }));
      dirtyTabs.current.delete(path);
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Failed to load file' });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh().then(() => openFile('ui/theme.json'));
  }, [refresh, openFile]);

  const treePaths = React.useMemo(() => {
    const overridePaths = files.map((f) => f.path);
    return overridePaths.length > 0 ? overridePaths : DEFAULT_STARTER_FILES.map((f) => f.path);
  }, [files]);
  const filteredTreePaths = React.useMemo(() => {
    const q = fileQuery.trim().toLowerCase();
    if (!q) return treePaths;
    return treePaths.filter((p) => p.toLowerCase().includes(q));
  }, [treePaths, fileQuery]);

  const treeRoot = React.useMemo(() => buildTree(filteredTreePaths), [filteredTreePaths]);
  const hasSelected = React.useMemo(() => files.some((f) => f.path === selectedPath), [files, selectedPath]);
  const activeContent = tabContent[activeTab] ?? '';
  const activeContentType = tabContentType[activeTab] ?? inferContentType(activeTab);
  const splitContent = tabContent[splitTab] ?? '';
  const splitContentType = tabContentType[splitTab] ?? inferContentType(splitTab);
  const splitCandidates = React.useMemo(() => openTabs.filter((p) => p !== activeTab), [openTabs, activeTab]);

  const validate = React.useCallback(() => {
    const p = activeTab || selectedPath;
    const content = tabContent[p] ?? '';
    if (p.toLowerCase().endsWith('.json')) {
      try {
        JSON.parse(content);
        setToast({ open: true, severity: 'success', message: 'JSON looks valid' });
        return true;
      } catch (e: any) {
        setToast({ open: true, severity: 'error', message: `Invalid JSON: ${e?.message || 'parse error'}` });
        return false;
      }
    }
    setToast({ open: true, severity: 'info', message: 'No validator for this file type yet' });
    return true;
  }, [activeTab, selectedPath, tabContent]);

  const save = React.useCallback(async (pathOverride?: string) => {
    const p = pathOverride || activeTab || selectedPath;
    const content = tabContent[p] ?? '';
    const contentType = tabContentType[p] ?? inferContentType(p);
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await upsertOverrideFile({ path: p, content, contentType });
      if (!res.success) throw new Error(res.error);
      setToast({ open: true, severity: 'success', message: 'Saved' });
      dirtyTabs.current.delete(p);
      await refresh();
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [activeTab, refresh, selectedPath, tabContent, tabContentType, validate]);

  const saveAll = React.useCallback(async () => {
    for (const p of openTabs) {
      if (dirtyTabs.current.has(p)) {
        // eslint-disable-next-line no-await-in-loop
        await save(p);
      }
    }
  }, [openTabs, save]);

  const format = React.useCallback(() => {
    const p = activeTab || selectedPath;
    const content = tabContent[p] ?? '';
    if (p.toLowerCase().endsWith('.json')) {
      try {
        const pretty = JSON.stringify(JSON.parse(content), null, 2);
        setTabContent((prev) => ({ ...prev, [p]: pretty }));
        dirtyTabs.current.add(p);
        setToast({ open: true, severity: 'success', message: 'Formatted JSON' });
      } catch (e: any) {
        setToast({ open: true, severity: 'error', message: `Cannot format JSON: ${e?.message || 'parse error'}` });
      }
      return;
    }
    setToast({ open: true, severity: 'info', message: 'Formatter is only enabled for JSON for now' });
  }, [activeTab, selectedPath, tabContent]);

  const remove = React.useCallback(async () => {
    setSaving(true);
    try {
      const res = await deleteOverrideFile(activeTab);
      if (!res.success) throw new Error(res.error);
      setToast({ open: true, severity: 'success', message: 'Deleted override (default will apply)' });
      await refresh();
      dirtyTabs.current.delete(activeTab);
      setOpenTabs((prev) => prev.filter((p) => p !== activeTab));
      const next = openTabs.filter((p) => p !== activeTab)[0] || 'ui/theme.json';
      await openFile(next);
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Delete failed' });
    } finally {
      setSaving(false);
    }
  }, [activeTab, openFile, openTabs, refresh]);

  const createFile = React.useCallback(() => {
    const p = createPath.trim().replace(/^\/+/, '');
    if (!p) return;
    setCreateOpen(false);
    setSelectedPath(p);
    setActiveTab(p);
    setOpenTabs((prev) => (prev.includes(p) ? prev : [...prev, p]));
    setTabContent((prev) => ({ ...prev, [p]: prev[p] ?? getStarterContent(p) }));
    setTabContentType((prev) => ({ ...prev, [p]: prev[p] ?? inferContentType(p) }));
    dirtyTabs.current.add(p);
  }, [createPath]);

  const runShell = React.useCallback(async () => {
    setShellRunning(true);
    setShellOut('');
    try {
      const cmdTrim = shellCmd.trim();
      if (cmdTrim) {
        setShellHistory((prev) => [cmdTrim, ...prev.filter((p) => p !== cmdTrim)].slice(0, 30));
      }
      setHistoryIndex(-1);
      const res = await runCompanyShellCommand(shellCmd);
      if (!res.success) throw new Error(res.error);
      setShellOut(`${res.stdout || ''}${res.stderr ? `\n${res.stderr}` : ''}`.trim() || `(exit ${res.code})`);
    } catch (e: any) {
      setShellOut(e?.message || 'Command failed');
    } finally {
      setShellRunning(false);
    }
  }, [shellCmd]);
  const shellInputRef = React.useRef<HTMLInputElement | null>(null);

  const resizeStartY = React.useRef<number | null>(null);
  const resizeStartHeight = React.useRef<number>(220);

  const onResizeStart = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = shellDockHeight;

    const onMove = (ev: MouseEvent) => {
      if (resizeStartY.current == null) return;
      const delta = resizeStartY.current - ev.clientY;
      const next = Math.min(420, Math.max(140, resizeStartHeight.current + delta));
      setShellDockHeight(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      resizeStartY.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [shellDockHeight]);

  const editorHeight = shellDockOpen ? `calc(100vh - ${430 + shellDockHeight * 0.25}px)` : 'calc(100vh - 300px)';

  React.useEffect(() => {
    if (!splitView) return;
    if (!splitTab || splitTab === activeTab) {
      const candidate = openTabs.find((p) => p !== activeTab) || activeTab;
      setSplitTab(candidate);
    }
  }, [splitView, splitTab, activeTab, openTabs]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.key.toLowerCase() === 'j')) {
        e.preventDefault();
        setShellDockOpen(true);
        setTimeout(() => shellInputRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  return (
    <Stack spacing={2} sx={{ width: '100%', px: { xs: 1, md: 1.5 }, py: 1.5 }}>
      <Box>
        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', color: 'text.primary' }}>
          Developer Overrides
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Per-company config and templates. Changes apply only to your organization.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Start by editing <strong>ui/theme.json</strong>, <strong>ui/navigation.json</strong>, and <strong>ui/dashboard.layout.json</strong>. JSON is validated on save.
      </Alert>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="stretch">
        <Paper
          variant="outlined"
          sx={{
            width: { xs: '100%', md: 320 },
            borderRadius: 2.5,
            overflow: 'hidden',
            borderColor: (t) => alpha(t.palette.divider, 0.5),
            bgcolor: '#1e1e1e',
            color: '#d4d4d4',
          }}
        >
          <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#252526' }}>
            <CodeOutlinedIcon fontSize="small" />
            <Typography fontWeight={700}>Files</Typography>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="New file">
              <IconButton size="small" onClick={() => { setCreatePath('ui/new-file.json'); setCreateOpen(true); }} disabled={loading}>
                <NoteAddOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="New folder (implicit)">
              <IconButton size="small" onClick={() => { setCreatePath('ui/new-folder/new-file.json'); setCreateOpen(true); }} disabled={loading}>
                <CreateNewFolderOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Terminal">
              <IconButton size="small" onClick={() => setShellDockOpen((v) => !v)} disabled={loading}>
                <TerminalOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button size="small" startIcon={<RefreshOutlinedIcon />} onClick={refresh} disabled={loading}>
              Refresh
            </Button>
          </Box>
          <Divider sx={{ borderColor: alpha('#ffffff', 0.08) }} />
          <Box sx={{ p: 1.25 }}>
            <Box
              sx={{
                mb: 1.25,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.5,
                borderRadius: 1.5,
                bgcolor: alpha('#ffffff', 0.06),
                border: `1px solid ${alpha('#ffffff', 0.08)}`,
              }}
            >
              <SearchRoundedIcon sx={{ fontSize: 16, color: '#9e9e9e' }} />
              <input
                value={fileQuery}
                onChange={(e) => setFileQuery(e.target.value)}
                placeholder="Search files..."
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#e0e0e0',
                  outline: 'none',
                  fontSize: 13,
                }}
              />
            </Box>
            <SimpleTreeView
              selectedItems={selectedPath}
              onSelectedItemsChange={(_, ids) => {
                const next = Array.isArray(ids) ? ids[0] : (ids as any);
                if (next) openFile(next);
              }}
              sx={{
                maxHeight: 'calc(100vh - 280px)',
                overflow: 'auto',
                color: '#d4d4d4',
                '& .MuiTreeItem-content:hover': { bgcolor: alpha('#ffffff', 0.06) },
                '& .MuiTreeItem-content.Mui-selected': { bgcolor: alpha('#0AA775', 0.22) },
              }}
            >
              {renderTree(treeRoot)}
            </SimpleTreeView>
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            borderRadius: 2.5,
            overflow: 'hidden',
            borderColor: (t) => alpha(t.palette.divider, 0.5),
            minHeight: 'calc(100vh - 210px)',
            bgcolor: '#1e1e1e',
            color: '#d4d4d4',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ px: 1.25, pt: 1, pb: 0.5, display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#252526' }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => {
                setActiveTab(v);
                setSelectedPath(v);
              }}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ minHeight: 38, flex: 1, '& .MuiTab-root': { color: '#bdbdbd' }, '& .MuiTabs-indicator': { bgcolor: '#0AA775' } }}
            >
              {openTabs.map((p) => (
                <Tab
                  key={p}
                  value={p}
                  label={
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>
                        {p.split('/').pop()}
                      </Typography>
                      {dirtyTabs.current.has(p) && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main' }} />}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          dirtyTabs.current.delete(p);
                          setOpenTabs((prev) => prev.filter((x) => x !== p));
                          if (activeTab === p) {
                            const next = openTabs.filter((x) => x !== p)[0] || 'ui/theme.json';
                            openFile(next);
                          }
                        }}
                        sx={{ ml: 0.25 }}
                      >
                        <CloseOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  }
                  sx={{ minHeight: 38, textTransform: 'none', pr: 0 }}
                />
              ))}
            </Tabs>
            <Chip
              size="small"
              label={hasSelected ? 'Override' : 'Not saved yet'}
              color={hasSelected ? 'primary' : 'default'}
              variant={hasSelected ? 'filled' : 'outlined'}
              sx={{ fontWeight: 700 }}
            />
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" startIcon={<FormatAlignLeftOutlinedIcon />} onClick={format} disabled={loading}>
              Format
            </Button>
            <Button size="small" variant="outlined" onClick={validate} disabled={loading}>
              Validate
            </Button>
            <Button size="small" startIcon={<SaveOutlinedIcon />} variant="contained" onClick={() => save()} disabled={saving || loading}>
              Save
            </Button>
            <Button size="small" variant="outlined" onClick={saveAll} disabled={saving || loading || openTabs.length === 0}>
              Save all
            </Button>
            <Tooltip title="Toggle split editor">
              <IconButton
                size="small"
                onClick={() => {
                  setSplitView((v) => !v);
                  if (!splitTab) {
                    const candidate = openTabs.find((p) => p !== activeTab) || activeTab;
                    setSplitTab(candidate);
                  }
                }}
              >
                <SplitscreenRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              startIcon={<DeleteOutlineOutlinedIcon />}
              color="error"
              variant="outlined"
              onClick={remove}
              disabled={saving || loading || !hasSelected}
            >
              Delete override
            </Button>
          </Box>
          <Divider sx={{ borderColor: alpha('#ffffff', 0.08) }} />
          <Box sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack direction={{ xs: 'column', lg: splitView ? 'row' : 'column' }} spacing={splitView ? 0.5 : 0}>
              <Box sx={{ flex: 1 }}>
                <Editor
                  height={editorHeight}
                  language={toMonacoLanguage(activeTab)}
                  value={activeContent}
                  onChange={(v) => {
                    const next = v ?? '';
                    setTabContent((prev) => ({ ...prev, [activeTab]: next }));
                    dirtyTabs.current.add(activeTab);
                  }}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    smoothScrolling: true,
                    cursorBlinking: 'phase',
                    renderLineHighlight: 'all',
                    padding: { top: 10, bottom: 10 },
                  }}
                />
              </Box>
              {splitView && (
                <Box sx={{ flex: 1, borderLeft: { lg: `1px solid ${alpha('#ffffff', 0.08)}` } }}>
                  <Box sx={{ px: 1, py: 0.5, bgcolor: '#202020', borderBottom: `1px solid ${alpha('#ffffff', 0.08)}` }}>
                    <Tabs
                      value={splitCandidates.includes(splitTab) ? splitTab : false}
                      onChange={(_, v) => setSplitTab(v)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ minHeight: 30, '& .MuiTab-root': { minHeight: 30, textTransform: 'none', color: '#bdbdbd', fontSize: 12 } }}
                    >
                      {splitCandidates.map((p) => (
                        <Tab key={p} value={p} label={p.split('/').pop()} />
                      ))}
                    </Tabs>
                  </Box>
                  <Editor
                    height={editorHeight}
                    language={toMonacoLanguage(splitTab)}
                    value={splitContent}
                    onChange={(v) => {
                      const next = v ?? '';
                      setTabContent((prev) => ({ ...prev, [splitTab]: next }));
                      dirtyTabs.current.add(splitTab);
                    }}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      smoothScrolling: true,
                      cursorBlinking: 'phase',
                      renderLineHighlight: 'all',
                      padding: { top: 10, bottom: 10 },
                    }}
                  />
                  <Box sx={{ px: 1, py: 0.25, bgcolor: '#202020' }}>
                    <Typography variant="caption" sx={{ color: '#9e9e9e' }}>
                      Split pane • {splitContentType}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Stack>
            <Divider sx={{ borderColor: alpha('#ffffff', 0.08) }} />
            <Box sx={{ px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#252526' }}>
              <Chip size="small" label={activeContentType} sx={{ height: 22, fontWeight: 700 }} />
              <Typography variant="caption" sx={{ color: '#9e9e9e' }}>
                Monaco editor • VS Code style workspace
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" sx={{ color: '#9e9e9e' }}>
                Allowed terminal commands: ls, pwd, cat, head, tail, wc
              </Typography>
            </Box>

            <Divider sx={{ borderColor: alpha('#ffffff', 0.08) }} />
            <Box sx={{ bgcolor: '#1a1a1a' }}>
              <Box
                onMouseDown={onResizeStart}
                sx={{
                  display: shellDockOpen ? 'flex' : 'none',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'row-resize',
                  height: 10,
                  bgcolor: '#202020',
                  '&:hover': { bgcolor: '#2a2a2a' },
                }}
              >
                <DragIndicatorRoundedIcon sx={{ fontSize: 16, color: '#9e9e9e' }} />
              </Box>

              <Box sx={{ px: 1.25, py: 0.75, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#252526' }}>
                <TerminalOutlinedIcon sx={{ fontSize: 18, color: '#8bc34a' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#d4d4d4' }}>
                  TERMINAL
                </Typography>
                <Typography variant="caption" sx={{ color: '#9e9e9e' }}>
                  Ctrl/Cmd+J focus • Enter run • Up/Down history
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Tooltip title={shellDockOpen ? 'Collapse terminal' : 'Expand terminal'}>
                  <IconButton size="small" onClick={() => setShellDockOpen((v) => !v)}>
                    {shellDockOpen ? <KeyboardArrowDownRoundedIcon fontSize="small" /> : <KeyboardArrowUpRoundedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>

              {shellDockOpen && (
                <Box sx={{ px: 1.25, pb: 1.25 }}>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <input
                      ref={shellInputRef}
                      value={shellCmd}
                      onChange={(e) => setShellCmd(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void runShell();
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (shellHistory.length === 0) return;
                          const next = Math.min(shellHistory.length - 1, historyIndex + 1);
                          setHistoryIndex(next);
                          setShellCmd(shellHistory[next]);
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (shellHistory.length === 0) return;
                          const next = historyIndex - 1;
                          if (next < 0) {
                            setHistoryIndex(-1);
                            setShellCmd('');
                          } else {
                            setHistoryIndex(next);
                            setShellCmd(shellHistory[next]);
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #3a3a3a',
                        background: '#111111',
                        color: '#e0e0e0',
                      }}
                      placeholder="ls"
                    />
                    <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={runShell} disabled={shellRunning}>
                      Run
                    </Button>
                  </Box>
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 1,
                      p: 1.25,
                      borderRadius: 1.5,
                      bgcolor: '#111111',
                      borderColor: alpha('#ffffff', 0.12),
                      height: shellDockHeight,
                      overflow: 'auto',
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        color: '#d4d4d4',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {shellOut || 'Run a command to see output...'}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      </Stack>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        message={toast.message}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create file</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <input
              value={createPath}
              onChange={(e) => setCreatePath(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Use paths like <b>ui/theme.json</b> or <b>templates/email/welcome.hbs</b>.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createFile}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

    </Stack>
  );
}

function getStarterContent(path: string) {
  const found = DEFAULT_STARTER_FILES.find((f) => f.path === path);
  return found?.content ?? '';
}

function toMonacoLanguage(filePath: string) {
  const p = (filePath || '').toLowerCase();
  if (p.endsWith('.json')) return 'json';
  if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'typescript';
  if (p.endsWith('.js') || p.endsWith('.jsx')) return 'javascript';
  if (p.endsWith('.md')) return 'markdown';
  if (p.endsWith('.hbs')) return 'handlebars';
  if (p.endsWith('.css')) return 'css';
  if (p.endsWith('.html')) return 'html';
  return 'plaintext';
}

