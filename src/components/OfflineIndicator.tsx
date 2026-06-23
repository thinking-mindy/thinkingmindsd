"use client";

import React from 'react';
import { Box, Chip, Tooltip, CircularProgress } from '@mui/material';
import { CloudOff, CloudSync, CloudDone } from '@mui/icons-material';
import { useNetworkStatus } from '@/lib/offline/network';
import { syncManager } from '@/lib/offline/sync';
import { offlineQueue } from '@/lib/offline/queue';
import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [syncing, setSyncing] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const unsubscribe = syncManager.onSyncStatusChange(setSyncing);
    
    // Update queue size periodically
    const updateQueueSize = async () => {
      const size = await offlineQueue.size();
      setQueueSize(size);
    };
    
    updateQueueSize();
    const interval = setInterval(updateQueueSize, 5000);

    // Auto-sync when coming back online
    if (isOnline && wasOffline) {
      syncManager.sync().then(() => {
        updateQueueSize();
      });
    }

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOnline, wasOffline]);

  if (isOnline && queueSize === 0 && !syncing) {
    return null; // Don't show when everything is synced
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        gap: 1,
        alignItems: 'center',
      }}
    >
      {!isOnline ? (
        <Tooltip title="You're offline. Changes will be saved locally and synced when you're back online.">
          <Chip
            icon={<CloudOff />}
            label="Offline Mode"
            color="warning"
            sx={{
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(255, 152, 0, 0.9)',
              color: 'white',
              fontWeight: 600,
            }}
          />
        </Tooltip>
      ) : syncing ? (
        <Tooltip title="Syncing your changes...">
          <Chip
            icon={<CircularProgress size={16} color="inherit" />}
            label="Syncing..."
            color="info"
            sx={{
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(33, 150, 243, 0.9)',
              color: 'white',
              fontWeight: 600,
            }}
          />
        </Tooltip>
      ) : queueSize > 0 ? (
        <Tooltip title={`${queueSize} item(s) pending sync`}>
          <Chip
            icon={<CloudSync />}
            label={`${queueSize} Pending`}
            color="info"
            onClick={async () => {
              await syncManager.sync();
            }}
            sx={{
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(33, 150, 243, 0.9)',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'rgba(33, 150, 243, 1)',
              },
            }}
          />
        </Tooltip>
      ) : (
        <Tooltip title="All changes synced">
          <Chip
            icon={<CloudDone />}
            label="Synced"
            color="success"
            sx={{
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(76, 175, 80, 0.9)',
              color: 'white',
              fontWeight: 600,
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}
