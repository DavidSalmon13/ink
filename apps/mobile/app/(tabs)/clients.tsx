import { useState } from 'react';

import type { Client } from '@/api/clients';
import { ClientFormModal, ClientsList } from '@/features/clients';

/** The Clients tab (client-list): the searchable list, with the create/edit modal over it. */
export default function ClientsTab() {
  // 'new' = creating; a Client = editing it; null = closed.
  const [editing, setEditing] = useState<Client | 'new' | null>(null);
  // Bumped per open, so each open mounts a fresh form (a new client gets its own UUID).
  const [openCount, setOpenCount] = useState(0);
  const open = (target: Client | 'new') => {
    setOpenCount((n) => n + 1);
    setEditing(target);
  };

  return (
    <>
      <ClientsList onCreate={() => open('new')} onSelect={open} />
      {editing ? (
        <ClientFormModal
          key={openCount}
          client={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
