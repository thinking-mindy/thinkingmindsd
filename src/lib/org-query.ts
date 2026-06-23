import { ObjectId } from 'mongodb';

/** Match org records stored as ObjectId or string `orgId`. */
export function buildOrgFilter(
  companyId?: string,
  userOrgId?: unknown
): { $or: Record<string, unknown>[] } | null {
  const or: Record<string, unknown>[] = [];

  if (companyId) {
    or.push({ orgId: companyId });
    if (ObjectId.isValid(companyId)) {
      or.push({ orgId: new ObjectId(companyId) });
    }
  }

  if (userOrgId != null && userOrgId !== '') {
    or.push({ orgId: userOrgId });
    const asString =
      typeof userOrgId === 'object' && userOrgId !== null && 'toString' in userOrgId
        ? (userOrgId as { toString: () => string }).toString()
        : String(userOrgId);
    if (!or.some((clause) => clause.orgId === asString)) {
      or.push({ orgId: asString });
    }
  }

  return or.length ? { $or: or } : null;
}

export function poLookupFilter(id: string | ObjectId) {
  if (id instanceof ObjectId) {
    return { $or: [{ _id: id }, { poNumber: id }] };
  }
  if (ObjectId.isValid(id)) {
    const oid = new ObjectId(id);
    return { $or: [{ _id: oid }, { poNumber: oid }] };
  }
  return { poNumber: id };
}

export function projectLookupFilter(id: string | ObjectId) {
  if (id instanceof ObjectId) {
    return { $or: [{ _id: id }, { projectId: id }] };
  }
  if (ObjectId.isValid(id)) {
    const oid = new ObjectId(id);
    return { $or: [{ _id: oid }, { projectId: oid }] };
  }
  return { projectId: id };
}

export function taskLookupFilter(id: string | ObjectId) {
  if (id instanceof ObjectId) {
    return { $or: [{ _id: id }, { taskId: id }] };
  }
  if (ObjectId.isValid(id)) {
    const oid = new ObjectId(id);
    return { $or: [{ _id: oid }, { taskId: oid }, { id: id }] };
  }
  return { $or: [{ id: id }, { taskId: id }] };
}

export function contactLookupFilter(id: string | ObjectId) {
  if (id instanceof ObjectId) {
    return { $or: [{ _id: id }, { contactId: id }] };
  }
  if (ObjectId.isValid(id)) {
    const oid = new ObjectId(id);
    return { $or: [{ _id: oid }, { contactId: oid }] };
  }
  return { contactId: id };
}
