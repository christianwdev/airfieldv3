import { memoryNonceStore, redisNonceStore } from '@starfall-kit/auth/social';
import { resendTransport } from '@starfall-kit/email/resend';
import { consoleTransport } from '@starfall-kit/email/testing';
import { memoryStore, redisStore } from '@starfall-kit/hono';
import { RedisClient } from 'bun';

import { readConfig } from '~/config/config';
import { createDatabase } from '~/database/database';
import createRoutes from '~/routes';
import { createAppMailer } from '~/utils/email';

const config = readConfig(process.env);
const redis = config.REDIS_URL === undefined ? null : new RedisClient(config.REDIS_URL);
const transport =
  config.RESEND_API_KEY === undefined
    ? consoleTransport()
    : resendTransport({ apiKey: config.RESEND_API_KEY });

const app = createRoutes({
  config,
  db: createDatabase(config.DATABASE_URL),
  mailer: createAppMailer(transport, config.EMAIL_FROM, config.FRONTEND_URL),
  rateLimitStore: redis ? redisStore(redis) : memoryStore(),
  nonceStore: redis ? redisNonceStore(redis) : memoryNonceStore(),
});

const server = Bun.serve({ port: config.PORT, fetch: app.fetch });

console.log(`API listening on ${server.url.href}`);
