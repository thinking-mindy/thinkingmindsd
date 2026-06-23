import 'server-only';

import client from '@/lib/mongodb';
import {
  offlineUserToSessionUser,
  type SessionProfilePayload,
} from '@/lib/auth/session-user';
import type { SessionUser } from '@/lib/auth/types';
import {
  profilePayloadFromOfflineUser,
  serializeOfflineProfileCookie,
  OFFLINE_PROFILE_COOKIE,
} from '@/lib/offline/offline-profile';
import { cookies } from 'next/headers';

async function findUserDoc(userId: string) {
  const con = await client.connect();
  const db = con.db('thinkingminds');
  return db.collection('users').findOne({ $or: [{ clerkId: userId }, { id: userId }] });
}

function docToSessionUser(doc: Record<string, unknown>): SessionUser {
  const email =
    (typeof doc.email === 'string' && doc.email) ||
    (doc.emailAddresses as { emailAddress?: string }[] | undefined)?.[0]?.emailAddress ||
    '';
  const meta = {
    ...(typeof doc.metadata === 'object' && doc.metadata ? (doc.metadata as Record<string, unknown>) : {}),
    ...(typeof doc.public_metadata === 'object' && doc.public_metadata
      ? (doc.public_metadata as Record<string, unknown>)
      : {}),
    ...(typeof doc.publicMetadata === 'object' && doc.publicMetadata
      ? (doc.publicMetadata as Record<string, unknown>)
      : {}),
    role: (doc.role as string | undefined) ?? (doc.public_metadata as { role?: string } | undefined)?.role,
    companyId:
      doc.orgId?.toString?.() ??
      (doc.companyId as string | undefined) ??
      (doc.public_metadata as { companyId?: string } | undefined)?.companyId,
    companyName: (doc.public_metadata as { companyName?: string } | undefined)?.companyName,
    allowedModules: (doc.public_metadata as { allowedModules?: string[] } | undefined)?.allowedModules,
    companyOwnerId: (doc.public_metadata as { companyOwnerId?: string } | undefined)?.companyOwnerId,
    onCompleteSetup: (doc.public_metadata as { onCompleteSetup?: boolean } | undefined)?.onCompleteSetup,
  };

  return offlineUserToSessionUser({
    id: String(doc.id ?? doc.clerkId ?? doc._id ?? ''),
    email,
    firstName: doc.firstName as string | undefined,
    lastName: doc.lastName as string | undefined,
    companyId: meta.companyId as string | undefined,
    metadata: meta,
  });
}

async function persistPublicMetadata(
  userId: string,
  patch: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const con = await client.connect();
  const db = con.db('thinkingminds');
  const existing = await findUserDoc(userId);
  if (!existing) return null;

  const mergedMeta = {
    ...(typeof existing.public_metadata === 'object' && existing.public_metadata
      ? (existing.public_metadata as Record<string, unknown>)
      : {}),
    ...patch,
  };

  await db.collection('users').updateOne(
    { $or: [{ clerkId: userId }, { id: userId }] },
    {
      $set: {
        public_metadata: mergedMeta,
        role: (patch.role as string | undefined) ?? existing.role,
        orgId: patch.companyId ?? existing.orgId,
      },
    }
  );

  const updated = await findUserDoc(userId);
  if (!updated) return null;
  const sessionUser = docToSessionUser(updated as Record<string, unknown>);

  try {
    const jar = await cookies();
    const raw = jar.get(OFFLINE_PROFILE_COOKIE)?.value;
    if (raw) {
      const current = JSON.parse(decodeURIComponent(raw)) as SessionProfilePayload;
      if (current?.id === userId) {
        const payload: SessionProfilePayload = {
          ...current,
          role: (sessionUser.publicMetadata as Record<string, unknown>).role as string | undefined,
          companyId: (sessionUser.publicMetadata as Record<string, unknown>).companyId as
            | string
            | undefined,
          companyName: (sessionUser.publicMetadata as Record<string, unknown>).companyName as
            | string
            | undefined,
          companyOwnerId: (sessionUser.publicMetadata as Record<string, unknown>)
            .companyOwnerId as string | undefined,
          allowedModules: (sessionUser.publicMetadata as Record<string, unknown>)
            .allowedModules as string[] | undefined,
          onCompleteSetup: (sessionUser.publicMetadata as Record<string, unknown>)
            .onCompleteSetup as boolean | undefined,
        };
        jar.set(OFFLINE_PROFILE_COOKIE, serializeOfflineProfileCookie(payload), {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        });
      }
    }
  } catch {
    /* cookie refresh is best-effort during static export */
  }

  return sessionUser;
}

/** Local user admin API (replaces legacy Clerk client). */
export async function userAdmin() {
  return {
    users: {
      getUser: async (userId: string) => {
        const doc = await findUserDoc(userId);
        if (!doc) {
          throw new Error(`User not found: ${userId}`);
        }
        return docToSessionUser(doc as Record<string, unknown>);
      },
      updateUser: async (
        userId: string,
        data: { publicMetadata?: Record<string, unknown> }
      ) => {
        if (!data.publicMetadata) return null;
        return persistPublicMetadata(userId, data.publicMetadata);
      },
      updateUserMetadata: async (
        userId: string,
        data: { publicMetadata?: Record<string, unknown> }
      ) => {
        if (!data.publicMetadata) return null;
        return persistPublicMetadata(userId, data.publicMetadata);
      },
      getUserList: async (_opts?: { last_active_at_since?: number }) => {
        const con = await client.connect();
        const db = con.db('thinkingminds');
        const rows = await db.collection('users').find({}).limit(200).toArray();
        const data = rows.map((row) => docToSessionUser(row as Record<string, unknown>));
        return { data, totalCount: data.length };
      },
    },
  };
}

export function profilePayloadFromSessionUser(
  user: Record<string, unknown>
): SessionProfilePayload {
  const meta = (user.publicMetadata as Record<string, unknown> | undefined) ?? {};
  return profilePayloadFromOfflineUser({
    id: String(user.id),
    email:
      (user.emailAddresses as { emailAddress: string }[] | undefined)?.[0]?.emailAddress ?? '',
    firstName: user.firstName as string | undefined,
    lastName: user.lastName as string | undefined,
    companyId: meta.companyId as string | undefined,
    metadata: meta,
  });
}
