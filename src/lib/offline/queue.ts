"use client";

import { offlineStorage } from './storage';

export interface QueuedAction {
  id: string;
  type: string;
  action: string;
  payload: any;
  timestamp: number;
  retries: number;
}

/**
 * Offline action queue manager
 */
class OfflineQueue {
  private readonly MAX_RETRIES = 3;
  private readonly QUEUE_KEY = 'offline_queue';

  /**
   * Add an action to the queue
   */
  async enqueue(type: string, action: string, payload: any): Promise<string> {
    const queue = await this.getQueue();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedAction: QueuedAction = {
      id,
      type,
      action,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };

    queue.push(queuedAction);
    await offlineStorage.set(this.QUEUE_KEY, queue);
    
    return id;
  }

  /**
   * Get all queued actions
   */
  async getQueue(): Promise<QueuedAction[]> {
    const queue = await offlineStorage.get<QueuedAction[]>(this.QUEUE_KEY);
    return queue || [];
  }

  /**
   * Remove an action from the queue
   */
  async dequeue(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((action) => action.id !== id);
    await offlineStorage.set(this.QUEUE_KEY, filtered);
  }

  /**
   * Clear the entire queue
   */
  async clear(): Promise<void> {
    await offlineStorage.set(this.QUEUE_KEY, []);
  }

  /**
   * Increment retry count for an action
   */
  async incrementRetry(id: string): Promise<boolean> {
    const queue = await this.getQueue();
    const action = queue.find((a) => a.id === id);
    
    if (action) {
      action.retries += 1;
      if (action.retries >= this.MAX_RETRIES) {
        // Remove if max retries reached
        await this.dequeue(id);
        return false;
      }
      await offlineStorage.set(this.QUEUE_KEY, queue);
      return true;
    }
    
    return false;
  }

  /**
   * Get queue size
   */
  async size(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }
}

export const offlineQueue = new OfflineQueue();
