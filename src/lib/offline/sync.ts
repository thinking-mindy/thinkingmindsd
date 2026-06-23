"use client";

import { offlineQueue } from './queue';
import { offlineStorage } from './storage';

/**
 * Sync manager for offline data
 */
class SyncManager {
  private syncing = false;
  private syncListeners: Array<(syncing: boolean) => void> = [];

  /**
   * Register a sync status listener
   */
  onSyncStatusChange(listener: (syncing: boolean) => void) {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  }

  private notifySyncStatus(syncing: boolean) {
    this.syncListeners.forEach((listener) => listener(syncing));
  }

  /**
   * Sync all queued actions
   */
  async sync(): Promise<{ success: number; failed: number }> {
    if (this.syncing) {
      return { success: 0, failed: 0 };
    }

    this.syncing = true;
    this.notifySyncStatus(true);

    try {
      const queue = await offlineQueue.getQueue();
      let success = 0;
      let failed = 0;

      for (const action of queue) {
        try {
          // Try to execute the action
          const result = await this.executeAction(action);
          
          if (result) {
            await offlineQueue.dequeue(action.id);
            success++;
          } else {
            const shouldRetry = await offlineQueue.incrementRetry(action.id);
            if (!shouldRetry) {
              failed++;
            }
          }
        } catch (error) {
          console.error('Failed to sync action:', action, error);
          const shouldRetry = await offlineQueue.incrementRetry(action.id);
          if (!shouldRetry) {
            failed++;
          }
        }
      }

      return { success, failed };
    } finally {
      this.syncing = false;
      this.notifySyncStatus(false);
    }
  }

  /**
   * Execute a queued action
   */
  private async executeAction(action: any): Promise<boolean> {
    try {
      // This is a placeholder - you'll need to implement actual API calls
      // based on your action types
      const response = await fetch(`/api/${action.type}/${action.action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action.payload),
      });

      return response.ok;
    } catch (error) {
      console.error('Action execution failed:', error);
      return false;
    }
  }

  /**
   * Check if currently syncing
   */
  isSyncing(): boolean {
    return this.syncing;
  }
}

export const syncManager = new SyncManager();
