import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri helpdesk API requires the desktop shell');
  }
}

export async function tauriHelpdeskCreateTicket(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('helpdesk_create_ticket_cmd', { data });
}

export async function tauriHelpdeskGetTicket(ticketId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>('helpdesk_get_ticket_cmd', {
    ticketId,
  });
}

export async function tauriHelpdeskGetTicketsByOrg(orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('helpdesk_get_tickets_by_org_cmd', {
    orgId,
  });
}

export async function tauriHelpdeskGetTicketsByStatus(orgId: string, status: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>(
    'helpdesk_get_tickets_by_status_cmd',
    {
      orgId,
      status,
    }
  );
}

export async function tauriHelpdeskGetTicketsByAssigned(userId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>(
    'helpdesk_get_tickets_by_assigned_cmd',
    {
      userId,
    }
  );
}

export async function tauriHelpdeskGetTicketsByCreator(userId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('helpdesk_get_tickets_by_creator_cmd', {
    userId,
  });
}

export async function tauriHelpdeskUpdateTicket(ticketId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>('helpdesk_update_ticket_cmd', {
    ticketId,
    data,
  });
}

export async function tauriHelpdeskAddMessageToTicket(
  ticketId: string,
  message: Record<string, unknown>
) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>(
    'helpdesk_add_message_to_ticket_cmd',
    {
      ticketId,
      message,
    }
  );
}

export async function tauriHelpdeskAssignTicket(ticketId: string, userId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>('helpdesk_assign_ticket_cmd', {
    ticketId,
    userId,
  });
}

export async function tauriHelpdeskDeleteTicket(ticketId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('helpdesk_delete_ticket_cmd', { ticketId });
}
