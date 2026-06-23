/**
 * Helpdesk API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriHelpdeskAddMessageToTicket,
  tauriHelpdeskAssignTicket,
  tauriHelpdeskCreateTicket,
  tauriHelpdeskDeleteTicket,
  tauriHelpdeskGetTicket,
  tauriHelpdeskGetTicketsByAssigned,
  tauriHelpdeskGetTicketsByCreator,
  tauriHelpdeskGetTicketsByOrg,
  tauriHelpdeskGetTicketsByStatus,
  tauriHelpdeskUpdateTicket,
} from '@/lib/desktop/helpdesk';

export async function createTicket(data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriHelpdeskCreateTicket(data);
  const { createTicket: serverFn } = await import('@/_actions/helpdesk');
  return serverFn(data as never);
}

export async function getTicket(ticketId: string) {
  if (isTauriBackendAvailable()) return tauriHelpdeskGetTicket(ticketId);
  const { getTicket: serverFn } = await import('@/_actions/helpdesk');
  return serverFn(ticketId);
}

export async function getTicketsByOrg(orgId: string) {
  if (isTauriBackendAvailable()) return tauriHelpdeskGetTicketsByOrg(orgId);
  const { getTicketsByOrg: serverFn } = await import('@/_actions/helpdesk');
  return serverFn(orgId);
}

export async function getTicketsByStatus(orgId: string, status: string) {
  if (isTauriBackendAvailable()) return tauriHelpdeskGetTicketsByStatus(orgId, status);
  const { getTicketsByStatus: serverFn } = await import('@/_actions/helpdesk');
  return serverFn(orgId, status as never);
}

export async function getTicketsByAssigned(userId: string) {
  if (isTauriBackendAvailable()) return tauriHelpdeskGetTicketsByAssigned(userId);
  const { getTicketsByAssigned: serverFn } = await import('@/_actions/helpdesk');
  return serverFn(userId);
}

export async function getTicketsByCreator(userId: string) {
  if (isTauriBackendAvailable()) return tauriHelpdeskGetTicketsByCreator(userId);
  const { getTicketsByCreator: serverFn } = await import('@/_actions/helpdesk');
  return serverFn(userId);
}

export async function updateTicket(ticketId: string, data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriHelpdeskUpdateTicket(ticketId, data);
  const { updateTicket: serverFn } = await import('@/_actions/helpdesk');
  return serverFn(ticketId, data as never);
}

export async function addMessageToTicket(ticketId: string, message: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriHelpdeskAddMessageToTicket(ticketId, message);
  const { addMessageToTicket: serverFn } = await import('@/_actions/helpdesk');
  return serverFn(ticketId, message as never);
}

export async function assignTicket(ticketId: string, userId: string) {
  if (isTauriBackendAvailable()) return tauriHelpdeskAssignTicket(ticketId, userId);
  const { assignTicket: serverFn } = await import('@/_actions/helpdesk');
  return serverFn(ticketId, userId);
}

export async function deleteTicket(ticketId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriHelpdeskDeleteTicket(ticketId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete ticket' };
  }
  const { deleteTicket: serverFn } = await import('@/_actions/helpdesk');
  return serverFn(ticketId);
}
