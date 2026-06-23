"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  CloudSync,
  Backup,
  Delete,
  Download,
  Upload,
  Storage,
} from '@mui/icons-material';
import { useNetworkStatus } from '@/lib/offline/network';
import { syncManager } from '@/lib/offline/sync';
import { offlineStorage } from '@/lib/offline/storage';
import { offlineQueue } from '@/lib/offline/queue';
import { refreshLicenseFromRemoteBridge } from '@/lib/desktop/licensing-bridge';
import {
  createMindsBackup,
  parseMindsBackupFile,
  saveMindsBackup,
  restoreMindsBackupMerge,
  formatRestoreSummary,
} from '@/lib/minds-backup';
import DesktopBackendPanel from '@/components/DesktopBackendPanel';

export default function SettingsPage() {
  const { isOnline } = useNetworkStatus();
  const [syncing, setSyncing] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshingLicense, setRefreshingLicense] = useState(false);
  const [secretsMeta, setSecretsMeta] = useState<{
    path: string;
    exists: boolean;
    size: number;
    updatedAt: string | null;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = syncManager.onSyncStatusChange(setSyncing);
    loadData();

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    const size = await offlineQueue.size();
    setQueueSize(size);
    
    try {
      const fileList = await offlineStorage.listFiles();
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      setMessage({ type: 'error', text: 'You must be online to sync' });
      return;
    }

    setLoading(true);
    try {
      const result = await syncManager.sync();
      setMessage({
        type: 'success',
        text: `Sync completed: ${result.success} succeeded, ${result.failed} failed`,
      });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Sync failed: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportMindsBackup = async () => {
    setLoading(true);
    try {
      const backup = await createMindsBackup();
      const stamp = new Date().toISOString().slice(0, 10);
      const { savedAs, usedSavePicker } = await saveMindsBackup(backup, `thinkingminds-${stamp}.minds`);
      const fileCount = Object.keys(backup.server.files ?? {}).length;
      const clientKeys = Object.keys(backup.client.localStorage ?? {}).length;
      setMessage({
        type: 'success',
        text: usedSavePicker
          ? `Backup saved to ${savedAs} — ${fileCount} database file(s), ${clientKeys} browser store key(s)`
          : `Backup downloaded as ${savedAs} — ${fileCount} database file(s), ${clientKeys} browser store key(s)`,
      });
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'Backup cancelled') return;
      setMessage({ type: 'error', text: 'Backup failed: ' + message });
    } finally {
      setLoading(false);
    }
  };

  const handleImportMindsBackup = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.minds,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading(true);
      try {
        const backup = await parseMindsBackupFile(file);
        const summary = await restoreMindsBackupMerge(backup);
        setMessage({
          type: 'success',
          text: `Restore complete (existing data kept): ${formatRestoreSummary(summary)}`,
        });
        await loadData();
      } catch (error) {
        setMessage({ type: 'error', text: 'Restore failed: ' + (error as Error).message });
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const handleClearOfflineData = async () => {
    if (!confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await offlineQueue.clear();
      for (const file of files) {
        await offlineStorage.deleteFile(file.replace('.json', ''));
      }
      setMessage({ type: 'success', text: 'Offline data cleared' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear data: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const checkSecretsFile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/offline-secrets?meta=1', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to check secrets file');
      }
      const meta = await res.json();
      setSecretsMeta(meta);
      setMessage({
        type: 'success',
        text: meta.exists
          ? `Secrets file found (${meta.size} bytes)`
          : 'Secrets file does not exist yet',
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Secrets file check failed: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshLicense = async () => {
    if (!isOnline) {
      setMessage({ type: 'error', text: 'You must be online to refresh license from remote MongoDB' });
      return;
    }
    setRefreshingLicense(true);
    try {
      const result = await refreshLicenseFromRemoteBridge();
      if (!result.success || !result.data) {
        setMessage({ type: 'error', text: result.error || 'License refresh failed' });
        return;
      }
      setMessage({
        type: 'success',
        text: `License refreshed (${result.data.tier}: $${result.data.priceMonthly}/month, ${result.data.daysRemaining} day(s) remaining)`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'License refresh failed: ' + (error as Error).message });
    } finally {
      setRefreshingLicense(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Offline Settings
      </Typography>

      {message && (
        <Alert
          severity={message.type}
          onClose={() => setMessage(null)}
          sx={{ mb: 2 }}
        >
          {message.text}
        </Alert>
      )}

      <Stack spacing={3}>
        <DesktopBackendPanel />

        {/* Sync Section */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
              <CloudSync />
              <Typography variant="h6">Sync Data</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Sync your offline changes with the server when you're back online.
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2">
                  Pending items: <strong>{queueSize}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {syncing ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={syncing || loading ? <CircularProgress size={20} /> : <CloudSync />}
                onClick={handleSync}
                disabled={!isOnline || syncing || loading || queueSize === 0}
                fullWidth
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Backup Section */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
              <Backup />
              <Typography variant="h6">Backup & Restore</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Export or restore a <strong>.minds</strong> archive with all local JSON databases, users,
              offline browser data, and encrypted login secrets. Restore merges only — records that
              already exist are skipped, never overwritten.
            </Typography>
            <Stack spacing={2} direction="row">
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <Download />}
                onClick={handleExportMindsBackup}
                disabled={loading}
                fullWidth
              >
                Backup to .minds file
              </Button>
              <Button
                variant="outlined"
                startIcon={loading ? <CircularProgress size={20} /> : <Upload />}
                onClick={handleImportMindsBackup}
                disabled={loading}
                fullWidth
              >
                Restore from .minds
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Storage Section */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
              <Storage />
              <Typography variant="h6">Offline Storage</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Manage your offline data files.
            </Typography>
            <List>
              {files.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No offline files" secondary="Files will appear here when you work offline" />
                </ListItem>
              ) : (
                files.map((file) => (
                  <ListItem
                    key={file}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={async () => {
                          await offlineStorage.deleteFile(file.replace('.json', ''));
                          await loadData();
                        }}
                      >
                        <Delete />
                      </IconButton>
                    }
                  >
                    <ListItemText primary={file} />
                  </ListItem>
                ))
              )}
            </List>
            <Divider sx={{ my: 2 }} />
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={handleClearOfflineData}
              disabled={loading || files.length === 0}
              fullWidth
            >
              Clear All Offline Data
            </Button>
          </CardContent>
        </Card>

        {process.env.NODE_ENV === 'development' && (
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                <Storage />
                <Typography variant="h6">Secrets file (dev only)</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Check whether encrypted offline login details exist on disk.
              </Typography>
              <Button variant="outlined" onClick={checkSecretsFile} disabled={loading} fullWidth>
                Check secrets file
              </Button>
              {secretsMeta && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Path:</strong> {secretsMeta.path}</Typography>
                  <Typography variant="body2"><strong>Exists:</strong> {secretsMeta.exists ? 'Yes' : 'No'}</Typography>
                  <Typography variant="body2"><strong>Size:</strong> {secretsMeta.size} bytes</Typography>
                  <Typography variant="body2">
                    <strong>Updated:</strong> {secretsMeta.updatedAt ?? 'N/A'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
              <CloudSync />
              <Typography variant="h6">License Refresh</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Pull the latest license details from remote MongoDB and sync them into local db.
            </Typography>
            <Button
              variant="contained"
              onClick={handleRefreshLicense}
              disabled={refreshingLicense || loading || !isOnline}
              startIcon={refreshingLicense ? <CircularProgress size={18} /> : <CloudSync />}
              fullWidth
            >
              {refreshingLicense ? 'Refreshing license...' : 'Refresh License from Remote'}
            </Button>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
