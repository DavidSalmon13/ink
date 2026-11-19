import type { ApiClient } from '@/api/client';

/** A client as the API returns it (client-list AC4). `tattooCount` is 0 until the Completed tattoos epic. */
export interface Client {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  notes: string | null;
  tattooCount: number;
}

/** The editable fields; `version` is absent when creating and the last-seen version when editing. */
export interface ClientInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  notes?: string | null;
  version?: number;
}

/** GET /clients, or GET /clients?q= when `q` isn't blank: server-side search (AC5), sorted by name (AC4). */
export function listClients(api: ApiClient, q?: string): Promise<Client[]> {
  const query = q?.trim();
  return api.apiFetch<Client[]>(query ? `/clients?q=${encodeURIComponent(query)}` : '/clients', { method: 'GET' });
}

/** One live client; ApiError `not_found` when it's unknown or deleted. */
export function getClient(api: ApiClient, id: string): Promise<Client> {
  return api.apiFetch<Client>(`/clients/${id}`, { method: 'GET' });
}

/**
 * Creates (no `version`, device-generated `id`) or updates (the last-seen `version`) a client.
 * Retrying the same call is safe. Throws ApiError `version_conflict` with `details.current` when
 * another device saved first, and `validation_failed` with `details.fields` for invalid input.
 */
export function putClient(api: ApiClient, id: string, input: ClientInput): Promise<Client> {
  return api.apiFetch<Client>(`/clients/${id}`, { method: 'PUT', body: input });
}

/** Soft-deletes a client (client-card AC7). Idempotent: deleting twice, or an unknown id, also succeeds. */
export function deleteClient(api: ApiClient, id: string): Promise<void> {
  return api.apiFetch<void>(`/clients/${id}`, { method: 'DELETE' });
}

/** The card's computed summary (client-card AC4): 0 / 0 / null until the later epics fill it. */
export interface ClientSummary {
  tattooCount: number;
  /** Integer agorot. */
  completedIncomeAgorot: number;
  nextAppointmentAt: string | null;
}

/** GET /clients/{id}/summary; ApiError `not_found` when the client is unknown or deleted. */
export function getClientSummary(api: ApiClient, id: string): Promise<ClientSummary> {
  return api.apiFetch<ClientSummary>(`/clients/${id}/summary`, { method: 'GET' });
}
