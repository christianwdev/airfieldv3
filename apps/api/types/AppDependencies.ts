import type { NonceStore } from '@starfall-kit/auth/social';
import type { RateLimitStore } from '@starfall-kit/hono';

import type { Config } from '~/config/config';
import type { Database } from '~/types/Database';
import type { AppMailer } from '~/utils/email';

export type AppDependencies = {
  config: Config;
  db: Database;
  mailer: AppMailer;
  rateLimitStore: RateLimitStore;
  nonceStore: NonceStore;
};
