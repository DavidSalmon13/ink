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

// Skeleton only (client-list T3, failing-first): implemented in T8.

export function listClients(_api: ApiClient, _q?: string): Promise<Client[]> {
  throw new Error('not implemented (T8)');
}

export function getClient(_api: ApiClient, _id: string): Promise<Client> {
  throw new Error('not implemented (T8)');
}

export function putClient(_api: ApiClient, _id: string, _input: ClientInput): Promise<Client> {
  throw new Error('not implemented (T8)');
}
