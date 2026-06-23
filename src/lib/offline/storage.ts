"use client";

/**
 * Local storage manager with file-like keys.
 * Avoids Tauri plugin-store APIs entirely.
 */
class OfflineStorage {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.initialized = true;
  }

  /** Save data to a file-like key */
  async saveToFile(key: string, data: any): Promise<void> {
    await this.init();
    await this.set(`file_${key}`, data);

    const index = (await this.get<string[]>('file_index')) || [];
    if (!index.includes(`file_${key}`)) {
      index.push(`file_${key}`);
      await this.set('file_index', index);
    }
  }

  /** Load data from a file-like key */
  async loadFromFile(key: string): Promise<any | null> {
    await this.init();
    return await this.get(`file_${key}`);
  }

  /** Save key-value */
  async set(key: string, value: any): Promise<void> {
    await this.init();
    localStorage.setItem(`offline_${key}`, JSON.stringify(value));
  }

  /** Get key-value */
  async get<T = any>(key: string): Promise<T | null> {
    await this.init();
    const data = localStorage.getItem(`offline_${key}`);
    return data ? (JSON.parse(data) as T) : null;
  }

  /** Delete a key */
  async delete(key: string): Promise<void> {
    await this.init();
    localStorage.removeItem(`offline_${key}`);
  }

  /** List all file-like keys */
  async listFiles(): Promise<string[]> {
    await this.init();
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('offline_file_')) {
        keys.push(key.replace('offline_file_', ''));
      }
    }
    return keys;
  }

  /** Delete file-like key */
  async deleteFile(key: string): Promise<void> {
    await this.init();
    await this.delete(`file_${key}`);
    const index = (await this.get<string[]>('file_index')) || [];
    const newIndex = index.filter((k) => k !== `file_${key}`);
    await this.set('file_index', newIndex);
  }

  /** Export all data */
  async exportBackup(): Promise<string> {
    await this.init();
    const backup: any = {
      timestamp: new Date().toISOString(),
      files: {},
      store: {},
    };

    try {
      const files = await this.listFiles();
      for (const file of files) {
        const data = await this.loadFromFile(file);
        if (data) {
          backup.files[file] = data;
        }
      }
    } catch (error) {
      console.error('Failed to export files:', error);
    }

    const commonKeys = ['offline_queue', 'offline_auth', 'offline_settings'];
    for (const key of commonKeys) {
      const value = await this.get(key);
      if (value) {
        backup.store[key] = value;
      }
    }

    return JSON.stringify(backup, null, 2);
  }

  /** Import backup data */
  async importBackup(backupJson: string): Promise<void> {
    await this.init();
    try {
      const backup = JSON.parse(backupJson);

      if (backup.files) {
        for (const [key, data] of Object.entries(backup.files)) {
          await this.saveToFile(key, data);
        }
      }

      if (backup.store) {
        for (const [key, value] of Object.entries(backup.store)) {
          await this.set(key, value);
        }
      }
    } catch (error) {
      console.error('Failed to import backup:', error);
      throw error;
    }
  }
}

export const offlineStorage = new OfflineStorage();
