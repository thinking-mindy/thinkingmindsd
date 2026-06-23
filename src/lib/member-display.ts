export type MemberNameSource = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  emailAddresses?: Array<{ emailAddress?: string }> | null;
  metadata?: Record<string, unknown> | null;
  public_metadata?: Record<string, unknown> | null;
  publicMetadata?: Record<string, unknown> | null;
};

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && trimmed !== 'undefined') return trimmed;
    }
  }
  return '';
}

function memberMeta(member: MemberNameSource): Record<string, unknown> {
  return (member.metadata ?? member.public_metadata ?? member.publicMetadata ?? {}) as Record<
    string,
    unknown
  >;
}

function memberEmail(member: MemberNameSource): string {
  const meta = memberMeta(member);
  return pickString(member.email, member.emailAddresses?.[0]?.emailAddress, meta.email);
}

/** Human-readable name for a member/user record from any storage shape. */
export function memberDisplayName(member: MemberNameSource): string {
  const meta = memberMeta(member);
  const email = memberEmail(member);
  const firstName = pickString(member.firstName, meta.firstName);
  const lastName = pickString(member.lastName, meta.lastName);
  const username = pickString(member.username, meta.username);
  const fromParts = [firstName, lastName].filter(Boolean).join(' ');

  return (
    pickString(member.fullName) ||
    fromParts ||
    username ||
    (email.includes('@') ? email.split('@')[0] : email) ||
    'Unknown User'
  );
}

export function memberInitial(member: MemberNameSource): string {
  return memberDisplayName(member).charAt(0).toUpperCase() || 'U';
}

export function enrichMemberRecord<T extends MemberNameSource>(
  member: T
): T & { fullName: string; firstName: string; lastName: string; email?: string } {
  const email = memberEmail(member);
  const meta = memberMeta(member);
  const firstName =
    pickString(member.firstName, meta.firstName) ||
    (email.includes('@') ? email.split('@')[0] : '') ||
    'User';
  const lastName = pickString(member.lastName, meta.lastName);
  const fullName = memberDisplayName({ ...member, firstName, lastName, email });

  return {
    ...member,
    ...(email ? { email } : {}),
    firstName,
    lastName,
    fullName,
  };
}
