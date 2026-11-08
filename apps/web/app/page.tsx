import { request } from '@starfall-kit/client';

import { api } from '@/lib/api';

export default async function Home() {
  const client = await api();
  const [health, me] = await Promise.all([
    request(client.health.$get()),
    request(client.auth.me.$get()),
  ]);

  return (
    <main>
      <h1>Airfield Temp</h1>
      <p>{health.success ? 'The API is up.' : `The API is not reachable (${health.code}).`}</p>
      <p>
        {me.success
          ? `Signed in as ${me.data.user.displayName ?? me.data.user.email ?? me.data.user.id}.`
          : 'Not signed in.'}
      </p>
    </main>
  );
}
