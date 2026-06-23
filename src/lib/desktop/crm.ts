import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri CRM API requires the desktop shell');
  }
}

export async function tauriCrmCreateContact(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('crm_create_contact_cmd', { data });
}

export async function tauriCrmGetContact(contactId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('crm_get_contact_cmd', { contactId });
}

export async function tauriCrmGetContactsByOrg(orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('crm_get_contacts_by_org_cmd', { orgId });
}

export async function tauriCrmGetContactsForCurrentOrg(limit?: number) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('crm_get_contacts_for_current_org_cmd', { limit: limit ?? null });
}

export async function tauriCrmSearchContacts(orgId: string, query: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('crm_search_contacts_cmd', { orgId, query });
}

export async function tauriCrmUpdateContact(contactId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('crm_update_contact_cmd', { contactId, data });
}

export async function tauriCrmAddDealToContact(contactId: string, deal: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('crm_add_deal_to_contact_cmd', { contactId, deal });
}

export async function tauriCrmUpdateDealOnContact(contactId: string, dealId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('crm_update_deal_on_contact_cmd', { contactId, dealId, data });
}

export async function tauriCrmDeleteDealFromContact(contactId: string, dealId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('crm_delete_deal_from_contact_cmd', { contactId, dealId });
}

export async function tauriCrmDeleteContact(contactId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('crm_delete_contact_cmd', { contactId });
}
