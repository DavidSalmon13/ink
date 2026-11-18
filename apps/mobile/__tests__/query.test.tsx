// covers client-list AC7, T7 — the query cache: persisted on native only, cleared when the session ends.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let mockStatus: 'loading' | 'signedIn' | 'signedOut' = 'signedIn';
jest.mock('@/auth/AuthProvider', () => ({ useAuth: () => ({ status: mockStatus }) }));

import { CACHE_KEY, clearQueryCache, createPersister, createQueryClient, QueryProvider, queryClient } from '@/query';

beforeEach(async () => {
  await AsyncStorage.clear();
  queryClient.clear();
  mockStatus = 'signedIn';
});

describe('createPersister', () => {
  it('persists on iPhone/iPad and not on web', () => {
    expect(createPersister('ios')).not.toBeNull();
    expect(createPersister('web')).toBeNull();
  });
});

describe('clearQueryCache', () => {
  it('drops cached queries and the persisted copy', async () => {
    const client = createQueryClient();
    client.setQueryData(['clients', ''], [{ id: 'c1' }]);
    await AsyncStorage.setItem(CACHE_KEY, '{"clientState":{}}');

    await clearQueryCache(client, createPersister('ios'));

    expect(client.getQueryData(['clients', ''])).toBeUndefined();
    expect(await AsyncStorage.getItem(CACHE_KEY)).toBeNull();
  });
});

describe('QueryProvider', () => {
  it('clears the cache when the session ends', async () => {
    const view = await render(
      <QueryProvider>
        <Text>app</Text>
      </QueryProvider>,
    );
    queryClient.setQueryData(['clients', ''], [{ id: 'c1' }]);

    mockStatus = 'signedOut';
    await view.rerender(
      <QueryProvider>
        <Text>app</Text>
      </QueryProvider>,
    );

    expect(queryClient.getQueryData(['clients', ''])).toBeUndefined();
  });
});
