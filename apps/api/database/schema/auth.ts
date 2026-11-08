import { createAuthTablesWith } from '@starfall-kit/auth/drizzle';
import { bigint, pgEnum, text } from 'drizzle-orm/pg-core';

const accountState = pgEnum('state', [ 'active', 'closed', 'banned' ]);

export const { users, accounts, sessions, tokens } = createAuthTablesWith({
  displayName: text('display_name'),
  avatarURL: text('avatar_url'),
  balance: bigint('balance', { mode: 'number' }).default(0),
  freeBalance: bigint('free_balance', { mode: 'number' }).default(0),
  status: accountState().default('active'),
  permissions: bigint('permissions', { mode: 'number' }),
});
