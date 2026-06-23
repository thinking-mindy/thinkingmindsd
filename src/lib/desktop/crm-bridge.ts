/**
 * CRM API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriCrmCreateContact,
  tauriCrmGetContact,
  tauriCrmGetContactsByOrg,
  tauriCrmGetContactsForCurrentOrg,
  tauriCrmSearchContacts,
  tauriCrmUpdateContact,
  tauriCrmAddDealToContact,
  tauriCrmUpdateDealOnContact,
  tauriCrmDeleteDealFromContact,
  tauriCrmDeleteContact,
} from '@/lib/desktop/crm';

export async function createContact(data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriCrmCreateContact(data);
  const { createContact: serverFn } = await import('@/_actions/crm');
  return serverFn(data as never);
}

export async function getContact(contactId: string) {
  if (isTauriBackendAvailable()) return tauriCrmGetContact(contactId);
  const { getContact: serverFn } = await import('@/_actions/crm');
  return serverFn(contactId);
}

export async function getContactsByOrg(orgId: string) {
  if (isTauriBackendAvailable()) return tauriCrmGetContactsByOrg(orgId);
  const { getContactsByOrg: serverFn } = await import('@/_actions/crm');
  return serverFn(orgId);
}

export async function getContactsForCurrentOrg(limit = 500) {
  if (isTauriBackendAvailable()) return tauriCrmGetContactsForCurrentOrg(limit);
  const { getContactsForCurrentOrg: serverFn } = await import('@/_actions/crm');
  return serverFn(limit);
}

export async function searchContacts(orgId: string, query: string) {
  if (isTauriBackendAvailable()) return tauriCrmSearchContacts(orgId, query);
  const { searchContacts: serverFn } = await import('@/_actions/crm');
  return serverFn(orgId, query);
}

export async function updateContact(contactId: string, data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriCrmUpdateContact(contactId, data);
  const { updateContact: serverFn } = await import('@/_actions/crm');
  return serverFn(contactId, data as never);
}

export async function addDealToContact(contactId: string, deal: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriCrmAddDealToContact(contactId, deal);
  const { addDealToContact: serverFn } = await import('@/_actions/crm');
  return serverFn(contactId, deal as never);
}

export async function updateDealOnContact(contactId: string, dealId: string, data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriCrmUpdateDealOnContact(contactId, dealId, data);
  const { updateDealOnContact: serverFn } = await import('@/_actions/crm');
  return serverFn(contactId, dealId, data as never);
}

export async function deleteDealFromContact(contactId: string, dealId: string) {
  if (isTauriBackendAvailable()) return tauriCrmDeleteDealFromContact(contactId, dealId);
  const { deleteDealFromContact: serverFn } = await import('@/_actions/crm');
  return serverFn(contactId, dealId);
}

export async function deleteContact(contactId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriCrmDeleteContact(contactId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete contact' };
  }
  const { deleteContact: serverFn } = await import('@/_actions/crm');
  return serverFn(contactId);
}
