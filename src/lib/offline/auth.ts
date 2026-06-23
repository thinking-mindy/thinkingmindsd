"use client";

import { offlineStorage } from './storage';

// Use a simple hash function for client-side (bcryptjs is heavy for browser)
// In production, consider using Web Crypto API or a lighter alternative
async function hashPassword(password: string): Promise<string> {
  // Simple hash - in production, use Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

import { getOfflineLoginSecret } from '@/lib/offline/offline-login-secret';

const LOGIN_SECRETS_FILE_KEY = 'secrets/login-details.enc.json';
const LOGIN_SECRETS_SALT =
  process.env.NEXT_PUBLIC_OFFLINE_SECRETS_SALT?.trim() || 'thinkingminds-offline-secrets-v1';

function loginSecretsPassphrase(): string {
  return getOfflineLoginSecret();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(loginSecretsPassphrase()),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(LOGIN_SECRETS_SALT),
      iterations: 120000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptLoginPayload(payload: unknown): Promise<{ iv: string; ciphertext: string; algo: string }> {
  const encoder = new TextEncoder();
  const key = await deriveEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    algo: 'AES-GCM-256',
  };
}

async function decryptLoginPayload(encrypted: { iv: string; ciphertext: string }): Promise<any | null> {
  try {
    const decoder = new TextDecoder();
    const key = await deriveEncryptionKey();
    const iv = base64ToBytes(encrypted.iv);
    const ciphertext = base64ToBytes(encrypted.ciphertext);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
    return JSON.parse(decoder.decode(plaintext));
  } catch {
    return null;
  }
}

type EncryptedLoginDetails = { iv: string; ciphertext: string; algo: string };

async function writeEncryptedSecretsToDisk(encrypted: EncryptedLoginDetails): Promise<void> {
  try {
    await fetch('/api/offline-secrets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(encrypted),
    });
  } catch {
    // Best-effort disk mirror; local offline storage remains authoritative fallback.
  }
}

async function readEncryptedSecretsFromDisk(): Promise<EncryptedLoginDetails | null> {
  try {
    const res = await fetch('/api/offline-secrets', {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as Partial<EncryptedLoginDetails>;
    if (!payload.iv || !payload.ciphertext || !payload.algo) return null;
    return {
      iv: payload.iv,
      ciphertext: payload.ciphertext,
      algo: payload.algo,
    };
  } catch {
    return null;
  }
}

async function deleteEncryptedSecretsFromDisk(): Promise<void> {
  try {
    await fetch('/api/offline-secrets', { method: 'DELETE' });
  } catch {
    // Best effort cleanup only.
  }
}

export interface OfflineUser {
  id: string;
  username?: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  metadata?: any;
  createdAt: number;
}

/**
 * Offline authentication manager
 */
class OfflineAuth {
  private readonly AUTH_KEY = 'offline_auth';
  private readonly USERS_KEY = 'offline_users';
  private readonly USERS_FILE = 'users.json';
  private readonly SESSION_FILE = 'session.json';
  private readonly LOGIN_SECRETS_FILE = LOGIN_SECRETS_FILE_KEY;

  /**
   * Register a user for offline login
   */
  async registerUser(
    email: string,
    password: string,
    userData?: Partial<OfflineUser>
  ): Promise<OfflineUser> {
    const users = await this.getUsers();
    
    // Check if user already exists
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = userData?.username?.trim().toLowerCase();
    const existing = users.find(
      (u) =>
        u.email.toLowerCase() === normalizedEmail ||
        (!!normalizedUsername && !!u.username && u.username.toLowerCase() === normalizedUsername)
    );
    if (existing) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    const user: OfflineUser = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: normalizedUsername || undefined,
      email: normalizedEmail,
      passwordHash,
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      companyId: userData?.companyId,
      metadata: userData?.metadata,
      createdAt: Date.now(),
    };

    users.push(user);
    await offlineStorage.set(this.USERS_KEY, users);
    await offlineStorage.saveToFile(this.USERS_FILE, users);

    return user;
  }

  async saveEncryptedLoginDetails(identifier: string, password: string, userId?: string): Promise<void> {
    const payload = {
      identifier: identifier.trim(),
      password,
      userId: userId || null,
      savedAt: Date.now(),
    };
    const encrypted = await encryptLoginPayload(payload);
    await offlineStorage.saveToFile(this.LOGIN_SECRETS_FILE, encrypted);
    await writeEncryptedSecretsToDisk(encrypted);
  }

  async getEncryptedLoginDetails(): Promise<{ identifier: string; password: string; userId?: string } | null> {
    let encrypted =
      (await offlineStorage.loadFromFile(this.LOGIN_SECRETS_FILE)) as
        | EncryptedLoginDetails
        | null;
    if (!encrypted?.iv || !encrypted?.ciphertext) {
      encrypted = await readEncryptedSecretsFromDisk();
      if (encrypted) {
        await offlineStorage.saveToFile(this.LOGIN_SECRETS_FILE, encrypted);
      }
    }
    if (!encrypted?.iv || !encrypted?.ciphertext) return null;
    const payload = await decryptLoginPayload({
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
    });
    if (!payload?.identifier || !payload?.password) return null;
    return {
      identifier: payload.identifier,
      password: payload.password,
      userId: payload.userId || undefined,
    };
  }

  /**
   * Authenticate offline user
   */
  async authenticate(identifier: string, password: string): Promise<OfflineUser | null> {
    const users = await this.getUsers();
    const normalized = identifier.trim().toLowerCase();
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === normalized ||
        (!!u.username && u.username.toLowerCase() === normalized)
    );

    if (!user) {
      return null;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    // Save current session
    await offlineStorage.set(this.AUTH_KEY, {
      userId: user.id,
      email: user.email,
      timestamp: Date.now(),
    });
    await offlineStorage.saveToFile(this.SESSION_FILE, {
      userId: user.id,
      email: user.email,
      timestamp: Date.now(),
    });
    await this.saveEncryptedLoginDetails(identifier, password, user.id);

    return user;
  }

  /**
   * Get current offline session
   */
  async getCurrentSession(): Promise<{ userId: string; email: string } | null> {
    const session =
      (await offlineStorage.get<{
        userId: string;
        email: string;
        timestamp: number;
      }>(this.AUTH_KEY)) ||
      (await offlineStorage.loadFromFile(this.SESSION_FILE));

    const normalized = session as
      | {
          userId: string;
          email: string;
          timestamp: number;
        }
      | null;

    if (!normalized) {
      return null;
    }

    // Check if session is still valid (24 hours)
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - normalized.timestamp > maxAge) {
      await this.logout();
      return null;
    }

    return {
      userId: normalized.userId,
      email: normalized.email,
    };
  }

  /**
   * Get current offline user
   */
  async getCurrentUser(): Promise<OfflineUser | null> {
    const session = await this.getCurrentSession();
    if (!session) {
      return null;
    }

    const users = await this.getUsers();
    return users.find((u) => u.id === session.userId) || null;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await offlineStorage.delete(this.AUTH_KEY);
    await offlineStorage.deleteFile(this.SESSION_FILE);
    await offlineStorage.deleteFile(this.LOGIN_SECRETS_FILE);
    await deleteEncryptedSecretsFromDisk();
    if (typeof window !== "undefined") {
      const { clearOfflineClientSession, notifyOfflineAuthChanged } = await import(
        "@/lib/offline/client-session"
      );
      clearOfflineClientSession();
      notifyOfflineAuthChanged();
    }
  }

  /**
   * Get all registered users
   */
  private async getUsers(): Promise<OfflineUser[]> {
    const fileUsers = await offlineStorage.loadFromFile(this.USERS_FILE);
    if (Array.isArray(fileUsers)) {
      return fileUsers as OfflineUser[];
    }
    const users = await offlineStorage.get<OfflineUser[]>(this.USERS_KEY);
    return users || [];
  }

  /**
   * Update user data
   */
  async updateUser(userId: string, updates: Partial<OfflineUser>): Promise<void> {
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.id === userId);

    if (index === -1) {
      throw new Error('User not found');
    }

    users[index] = { ...users[index], ...updates };
    await offlineStorage.set(this.USERS_KEY, users);
    await offlineStorage.saveToFile(this.USERS_FILE, users);
  }

  async listUsers(): Promise<OfflineUser[]> {
    return this.getUsers();
  }

  /** Safe profile fields for login picker UI (no password hash). */
  async listPublicProfiles(): Promise<
    Array<{
      id: string;
      email: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      companyId?: string;
      companyName?: string;
      displayName: string;
      initials: string;
      loginIdentifier: string;
    }>
  > {
    const users = await this.getUsers();
    return users.map((user) => {
      const displayName =
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        user.username ||
        user.email.split('@')[0];
      const initials = displayName
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        companyId: user.companyId,
        companyName: user.metadata?.companyName as string | undefined,
        displayName,
        initials,
        loginIdentifier: user.username || user.email,
      };
    });
  }

  async hasUsers(): Promise<boolean> {
    const users = await this.getUsers();
    return users.length > 0;
  }

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return { success: false, error: 'User not found' };
    }

    users.splice(index, 1);
    await offlineStorage.set(this.USERS_KEY, users);
    await offlineStorage.saveToFile(this.USERS_FILE, users);

    const session = await this.getCurrentSession();
    if (session?.userId === userId) {
      await this.logout();
    }

    removeRecentUser(userId);
    return { success: true };
  }
}

const RECENT_USERS_KEY = 'tm_recent_user_ids';

export function getRecentUserIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function recordRecentUser(userId: string): void {
  if (typeof window === 'undefined') return;
  const ids = getRecentUserIds().filter((id) => id !== userId);
  ids.unshift(userId);
  localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(ids.slice(0, 8)));
}

export function removeRecentUser(userId: string): void {
  if (typeof window === 'undefined') return;
  const ids = getRecentUserIds().filter((id) => id !== userId);
  localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(ids));
}

export function avatarColorFromId(id: string): string {
  const palette = ['#1565c0', '#2e7d32', '#6a1b9a', '#c62828', '#ef6c00', '#00838f', '#4527a0', '#ad1457'];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 1)) % 1000;
  return palette[hash % palette.length];
}

export const offlineAuth = new OfflineAuth();
