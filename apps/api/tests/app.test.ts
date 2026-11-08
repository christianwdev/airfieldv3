import { PGlite } from '@electric-sql/pglite';
import { memoryNonceStore } from '@starfall-kit/auth/social';
import { memoryTransport } from '@starfall-kit/email/testing';
import { memoryStore } from '@starfall-kit/hono';
import { describe, expect, test } from 'bun:test';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api-postgres';
import { drizzle } from 'drizzle-orm/pglite';
import { testClient } from 'hono/testing';

import { readConfig } from '~/config/config';
import * as schema from '~/database/schema/auth';
import createRoutes from '~/routes';
import { createAppMailer } from '~/utils/email';
import { fillProfile } from '~/utils/profile';

const baseConfig = {
  NODE_ENV: 'test',
  FRONTEND_URL: 'https://app.example.com',
  DATABASE_URL: 'postgres://localhost/test',
  CLIENT_IP_SOURCE: 'header:x-forwarded-for:1',
  AUTH_SECRET: 'a-test-secret-that-is-at-least-32-characters',
  EMAIL_FROM: 'Airfield Temp <hello@example.com>',
};

const visitor = { 'x-forwarded-for': '203.0.113.7' };

const statements = await generateMigration(
  await generateDrizzleJson({}),
  await generateDrizzleJson(schema),
);

async function setup(overrides: Record<string, string> = {}) {
  const client = new PGlite();

  for (const statement of statements) await client.exec(statement);

  const db = drizzle({ client });

  const transport = memoryTransport();
  const app = createRoutes({
    config: readConfig({ ...baseConfig, ...overrides }),
    db,
    mailer: createAppMailer(transport, baseConfig.EMAIL_FROM, baseConfig.FRONTEND_URL),
    rateLimitStore: memoryStore(),
    nonceStore: memoryNonceStore(),
  });

  return { app, db, client: testClient(app), transport };
}

const CSRF_COOKIE = '__Host-csrfToken';

async function signUp(client: Awaited<ReturnType<typeof setup>>['client']) {
  const registered = await client.auth.register.$post(
    { json: { email: 'pat@example.com', password: 'correct horse battery staple' } },
    { headers: visitor },
  );
  const pairs = registered.headers.getSetCookie().map(cookie => cookie.split(';')[0] ?? '');
  const csrf = pairs
    .find(pair => pair.startsWith(`${CSRF_COOKIE}=`))
    ?.slice(CSRF_COOKIE.length + 1);
  const cookie = pairs.join('; ');

  return {
    session: { ...visitor, cookie },
    withCSRF: { ...visitor, cookie, 'x-csrf-token': csrf ?? '' },
  };
}

function cookiesFrom(response: { headers: Headers }): string {
  return response.headers
    .getSetCookie()
    .map(cookie => cookie.split(';')[0] ?? '')
    .join('; ');
}

describe('api', () => {
  test('health reports the database as reachable', async () => {
    const { client } = await setup();
    const response = await client.health.$get();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: { status: 'ok' } });
  });

  test('registering signs the user in and sends a verification email', async () => {
    const { client, transport } = await setup();
    const registered = await client.auth.register.$post(
      { json: { email: 'new@example.com', password: 'correct horse battery staple' } },
      { headers: visitor },
    );

    expect(registered.status).toBe(201);
    expect(transport.sent.map(message => message.subject)).toEqual(['Confirm your email']);

    const me = await client.auth.me.$get(undefined, {
      headers: { ...visitor, cookie: cookiesFrom(registered) },
    });

    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ data: { user: { email: 'new@example.com' } } });
  });

  test('social sign-in is mounted only for configured providers', async () => {
    const plain = await setup();

    expect((await plain.app.request('/auth/social/google/start')).status).toBe(404);

    const withGoogle = await setup({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' });
    const start = await withGoogle.app.request('/auth/social/google/start');

    expect(start.status).toBe(302);
    expect(new URL(start.headers.get('location') ?? '').origin).toBe('https://accounts.google.com');
  });
});

describe('profile', () => {
  test('needs a session', async () => {
    const { client } = await setup();

    expect((await client.profile.$get(undefined, { headers: visitor })).status).toBe(401);
  });

  test('a signed-in user sets a display name, and /auth/me returns it', async () => {
    const { client } = await setup();
    const { session, withCSRF } = await signUp(client);
    const saved = await client.profile.$patch(
      { json: { displayName: '  Pat Example ' } },
      { headers: withCSRF },
    );

    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ data: { profile: { displayName: 'Pat Example' } } });

    const me = await client.auth.me.$get(undefined, { headers: session });
    const body = await me.json();

    expect(body.success && body.data.user.displayName).toBe('Pat Example');
  });

  test('editing needs the CSRF token and a real name', async () => {
    const { client } = await setup();
    const { session, withCSRF } = await signUp(client);

    const forged = await client.profile.$patch(
      { json: { displayName: 'Pat' } },
      { headers: session },
    );
    const blank = await client.profile.$patch(
      { json: { displayName: '   ' } },
      { headers: withCSRF },
    );

    expect(forged.status).toBe(403);
    expect(blank.status).toBe(400);
  });

  test('provider profiles only fill empty fields, and only with https avatars', async () => {
    const { client, db } = await setup();
    const { session, withCSRF } = await signUp(client);
    const me = await (await client.auth.me.$get(undefined, { headers: session })).json();
    const userID = me.success ? me.data.user.id : '';

    await fillProfile(db, userID, {
      displayName: 'From Google',
      avatarURL: 'http://example.com/a.png',
    });
    await client.profile.$patch({ json: { displayName: 'Chosen' } }, { headers: withCSRF });
    await fillProfile(db, userID, {
      displayName: 'From Steam',
      avatarURL: 'https://example.com/b.png',
    });

    const profile = await (await client.profile.$get(undefined, { headers: session })).json();

    expect(profile).toMatchObject({
      data: { profile: { displayName: 'Chosen', avatarURL: 'https://example.com/b.png' } },
    });
  });
});

describe('config', () => {
  test('refuses a short auth secret', () => {
    expect(() => readConfig({ ...baseConfig, AUTH_SECRET: 'short' })).toThrow(/AUTH_SECRET/);
  });

  test('refuses production without an email provider', () => {
    expect(() => readConfig({ ...baseConfig, NODE_ENV: 'production' })).toThrow(/RESEND_API_KEY/);
  });

  test('refuses half a Google configuration', () => {
    expect(() => readConfig({ ...baseConfig, GOOGLE_CLIENT_ID: 'id' })).toThrow(
      /GOOGLE_CLIENT_SECRET/,
    );
  });
});
