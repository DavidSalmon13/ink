import { useState } from 'react';

import type { Client } from '@/api/clients';
import { ClientsList } from '@/features/clients';

/** The Clients tab (client-list): the searchable list; the create/edit modal opens over it. */
export default function ClientsTab() {
  // 'new' = creating; a Client = editing it; null = closed. The modal itself arrives in T10.
  const [, setEditing] = useState<Client | 'new' | null>(null);

  return <ClientsList onCreate={() => setEditing('new')} onSelect={setEditing} />;
}
