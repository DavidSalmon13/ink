import { useLocalSearchParams, useRouter } from 'expo-router';

import { ClientCard } from '@/features/clients';

/** iPhone: a client's card, pushed from the Clients list (client-card AC1). Back, a delete or a 404 return to the list. */
export default function ClientRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toList = () => router.back();
  return <ClientCard id={id} onGone={toList} onBack={toList} />;
}
