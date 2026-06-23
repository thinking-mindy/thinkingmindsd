/**
 * Admin panel API — Rust/Tauri when available, Next server actions otherwise.
 */
import { getOfflineJoinRequests } from '@/lib/offline/company';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriAdminApproveJoinRequest,
  tauriAdminDeleteLocalCompany,
  tauriAdminDeleteLocalUser,
  tauriAdminListLocalCompanies,
  tauriAdminListLocalUsers,
  tauriAdminLoadPanel,
  tauriAdminRejectJoinRequest,
  tauriAdminUpdateUserModules,
} from '@/lib/desktop/admin';
import type { TauriAdminLoadPanel } from '@/lib/desktop/admin-types';
import type { LicenseStatus } from '@/lib/license-utils';

export type AdminLoadResult = TauriAdminLoadPanel;

export async function loadAdminPanel(isOwner: boolean): Promise<AdminLoadResult | null> {
  if (isTauriBackendAvailable()) {
    return tauriAdminLoadPanel();
  }
  return loadAdminPanelFromServer(isOwner);
}

async function loadAdminPanelFromServer(isOwner: boolean): Promise<AdminLoadResult | null> {
  const { getAdminCompanyContext } = await import('@/_actions/company-context');
  const {
    getJoinRequestsForCurrentOrg,
    importOfflineJoinRequests,
  } = await import('@/lib/desktop/join-requests-bridge');
  const { getLicenseStatusForCurrentUserBridge } = await import('@/lib/desktop/licensing-bridge');
  const { getOrgBridge, syncLocalOrgToDatabaseBridge } = await import('@/lib/desktop/orgs-bridge');
  const { getAllPlansBridge, getPlanBridge, getPlanBySlugBridge } = await import('@/lib/desktop/plans-bridge');
  const { getPaymentsForCurrentOrg } = await import('@/lib/desktop/payments-bridge');
  const { getMembers } = await import('@/lib/desktop/users-bridge');

  const companyCtx = await getAdminCompanyContext();
  if (!companyCtx.success) {
    return {
      companyContext: {
        success: false,
        companyId: '',
        error: companyCtx.error,
      },
      org: null,
      currentPlan: null,
      allPlans: [],
      licenseStatus: null,
      joinRequests: [],
      members: [],
      payments: [],
      isOwner,
    };
  }

  const { companyId, companyName: ctxCompanyName, email: ctxEmail } = companyCtx;
  try {
    await syncLocalOrgToDatabaseBridge({
      companyId,
      companyName: ctxCompanyName,
      email: ctxEmail,
    });
  } catch {
    /* non-fatal */
  }

  const orgRes = await getOrgBridge(companyId);
  const org = orgRes.success ? (orgRes.data as Record<string, unknown> | null) : null;

  let currentPlan: Record<string, unknown> | null = null;
  if (org?.planId) {
    const planRes = await getPlanBridge(org.planId as string);
    currentPlan = planRes.success ? (planRes.data as Record<string, unknown>) : null;
  }
  if (!currentPlan) {
    const freePlanRes = await getPlanBySlugBridge('free');
    currentPlan = freePlanRes.success ? (freePlanRes.data as Record<string, unknown>) : null;
  }

  const plansRes = await getAllPlansBridge();
  const allPlans =
    plansRes.success && plansRes.data
      ? (plansRes.data as Record<string, unknown>[])
      : [];

  const licenseStatus = (await getLicenseStatusForCurrentUserBridge()) as LicenseStatus | null;

  let joinRequests: Record<string, unknown>[] = [];
  if (isOwner) {
    try {
      const offlineRows = await getOfflineJoinRequests();
      const forThisOrg = offlineRows
        .filter((r) => r.companyId === companyId)
        .map((r) => ({
          companyId: r.companyId,
          userId: r.userId,
          userEmail: r.email,
          userName: r.name,
          status: r.status,
          requestedAt: r.createdAt,
        }));
      if (forThisOrg.length) {
        await importOfflineJoinRequests(forThisOrg);
      }
    } catch {
      /* ignore */
    }
    const requestsRes = await getJoinRequestsForCurrentOrg();
    joinRequests =
      requestsRes.success && requestsRes.data
        ? (requestsRes.data as Record<string, unknown>[])
        : [];
  }

  const membersRes = await getMembers();
  let members: Record<string, unknown>[] = [];
  if (membersRes.aye) {
    const membersData = Array.isArray(membersRes.aye) ? membersRes.aye : [];
    const orgMembers = membersData.filter((m: Record<string, unknown>) => {
      const orgIdValue = m.orgId
        ? typeof m.orgId === 'string'
          ? m.orgId
          : (m.orgId as { toString?: () => string })?.toString?.()
        : undefined;
      const metadataCompanyId =
        (m.public_metadata as { companyId?: string } | undefined)?.companyId ||
        (m.publicMetadata as { companyId?: string } | undefined)?.companyId ||
        (m.private_metadata as { companyId?: string } | undefined)?.companyId;
      return orgIdValue === companyId || metadataCompanyId === companyId;
    });
    members = (orgMembers.length > 0 ? orgMembers : membersData) as Record<string, unknown>[];
  }

  const paymentsRes = await getPaymentsForCurrentOrg();
  const payments =
    paymentsRes.success && 'data' in paymentsRes && paymentsRes.data
      ? (paymentsRes.data as Record<string, unknown>[])
      : [];

  return {
    companyContext: {
      success: true,
      companyId,
      companyName: ctxCompanyName,
      email: ctxEmail,
    },
    org,
    currentPlan,
    allPlans,
    licenseStatus,
    joinRequests,
    members,
    payments,
    isOwner,
  };
}

export async function updateOrgBridge(
  companyId: string,
  patch: Record<string, unknown>
) {
  if (isTauriBackendAvailable()) {
    const { updateOrgBridge: desktopOrgBridge } = await import('@/lib/desktop/orgs-bridge');
    return desktopOrgBridge(companyId, patch);
  }
  const { updateOrgBridge: desktopOrgBridge } = await import('@/lib/desktop/orgs-bridge');
  return desktopOrgBridge(companyId, patch);
}

export async function updateOrgPlanBridge(companyId: string, planId: string) {
  if (isTauriBackendAvailable()) {
    const { updateOrgPlanBridge: desktopOrgBridge } = await import('@/lib/desktop/orgs-bridge');
    return desktopOrgBridge(companyId, planId);
  }
  const { updateOrgPlanBridge: desktopOrgBridge } = await import('@/lib/desktop/orgs-bridge');
  return desktopOrgBridge(companyId, planId);
}

export async function approveJoinRequestBridge(requestId: string) {
  if (isTauriBackendAvailable()) {
    return tauriAdminApproveJoinRequest(requestId);
  }
  const { approveJoinRequest } = await import('@/lib/desktop/join-requests-bridge');
  return approveJoinRequest(requestId);
}

export async function rejectJoinRequestBridge(requestId: string) {
  if (isTauriBackendAvailable()) {
    return tauriAdminRejectJoinRequest(requestId);
  }
  const { rejectJoinRequest } = await import('@/lib/desktop/join-requests-bridge');
  return rejectJoinRequest(requestId);
}

export async function updateUserAllowedModulesBridge(
  userId: string,
  allowedModules: string[]
) {
  if (isTauriBackendAvailable()) {
    return tauriAdminUpdateUserModules(userId, allowedModules);
  }
  const { updateUserAllowedModules } = await import('@/lib/desktop/users-bridge');
  return updateUserAllowedModules(userId, allowedModules);
}

export async function listLocalAppUsersBridge() {
  if (isTauriBackendAvailable()) {
    return tauriAdminListLocalUsers();
  }
  const { listLocalAppUsers } = await import('@/_actions/local-admin');
  return listLocalAppUsers();
}

export async function listLocalAppCompaniesBridge() {
  if (isTauriBackendAvailable()) {
    return tauriAdminListLocalCompanies();
  }
  const { listLocalAppCompanies } = await import('@/_actions/local-admin');
  return listLocalAppCompanies();
}

export async function deleteLocalAppUserBridge(userId: string) {
  if (isTauriBackendAvailable()) {
    return tauriAdminDeleteLocalUser(userId);
  }
  const { deleteLocalAppUser } = await import('@/_actions/local-admin');
  return deleteLocalAppUser(userId);
}

export async function deleteLocalAppCompanyBridge(companyId: string) {
  if (isTauriBackendAvailable()) {
    return tauriAdminDeleteLocalCompany(companyId);
  }
  const { deleteLocalAppCompany } = await import('@/_actions/local-admin');
  return deleteLocalAppCompany(companyId);
}
