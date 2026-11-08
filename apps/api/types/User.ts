import type { PublicUser } from '@starfall-kit/auth';

import type { users } from '~/database/schema/auth';

export type SessionUser = PublicUser<typeof users.$inferSelect>;
