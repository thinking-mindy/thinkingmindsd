/**
 * Server-only access context — resolves org owner from DB when metadata is missing.
 */
import 'server-only';

import { currentUser } from '@/lib/auth/server';
import { ObjectId } from 'mongodb';
import client from '@/lib/mongodb';
import {
  accessSeedFromUser,
  buildAccessSnapshot,
  mergeAccessIdentity,
  type AccessSeed,
  type AccessSnapshot,
} from '@/lib/access-control';

export type { AccessSeed, AccessSnapshot };

export type ServerAccessContext = AccessSeed & {
  userId: string;
};

async function resolveOrgOwnerId(companyId?: string, companyOwnerId?: string): Promise<string | undefined> {
  if (companyOwnerId) return companyOwnerId;
  if (!companyId || !ObjectId.isValid(companyId)) return undefined;
  try {
    const con = await client.connect();
    const org = await con.db('thinkingminds').collection('orgs').findOne({
      _id: new ObjectId(companyId),
    });
    return org?.ownerId as string | undefined;
  } catch {
    return undefined;
  }
}

/** Full access context for the signed-in user (metadata + org owner from DB). */
export async function getAccessContext(): Promise<ServerAccessContext | null> {
  const user = await currentUser();
  if (!user?.id) return null;

  const seed = accessSeedFromUser(user);
  if (!seed) return null;

  const orgOwnerId = await resolveOrgOwnerId(seed.companyId, seed.orgOwnerId);
  return {
    ...seed,
    userId: user.id,
    orgOwnerId,
  };
}

export async function getAccessSnapshot(): Promise<AccessSnapshot | null> {
  const ctx = await getAccessContext();
  if (!ctx) return null;
  return buildAccessSnapshot(ctx);
}

export async function requireAccessContext(): Promise<ServerAccessContext> {
  const ctx = await getAccessContext();
  if (!ctx) throw new Error('Not authenticated');
  return ctx;
}

/** Seed for AccessControlProvider — use in server layouts. */
export async function getAccessSeedForLayout(): Promise<AccessSeed> {
  return (await getAccessContext()) ?? {};
}

export function buildAccessSnapshotFromSeeds(
  client?: AccessSeed | null,
  server?: AccessSeed | null
): AccessSnapshot {
  return buildAccessSnapshot(mergeAccessIdentity(client, server));
}
