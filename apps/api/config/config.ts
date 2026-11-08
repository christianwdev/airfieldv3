import type { ClientIPSource } from '@starfall-kit/hono';
import { z } from 'zod';

const HEADER_SOURCE = /^header:([A-Za-z0-9-]{1,64}):(\d{1,2})$/;

const optional = z.preprocess(
  value => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const clientIPSource = z
  .string()
  .default('socket')
  .transform((value, ctx): ClientIPSource => {
    if (value === 'socket') return { type: 'socket' };
    if (value === 'cloudflare') return { type: 'cloudflare' };

    const match = HEADER_SOURCE.exec(value);

    if (match?.[1] !== undefined && match[2] !== undefined)
      return { type: 'header', header: match[1], trustedHops: Number(match[2]) };

    ctx.addIssue({ code: 'custom', message: 'Use socket, cloudflare or header:<name>:<hops>.' });

    return z.NEVER;
  });

const configSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(6060),
    FRONTEND_URL: z.url({ protocol: /^https?$/ }),
    DATABASE_URL: z.url(),
    REDIS_URL: z.preprocess(value => (value === '' ? undefined : value), z.url().optional()),
    CLIENT_IP_SOURCE: clientIPSource,
    AUTH_SECRET: z.string().min(32),
    EMAIL_FROM: z.string().min(3),
    RESEND_API_KEY: optional,
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    STEAM_API_KEY: optional,
  })
  .superRefine((config, ctx) => {
    if (config.NODE_ENV === 'production' && config.RESEND_API_KEY === undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'Production needs a real email transport.',
      });
    if ((config.GOOGLE_CLIENT_ID === undefined) !== (config.GOOGLE_CLIENT_SECRET === undefined))
      ctx.addIssue({
        code: 'custom',
        path: ['GOOGLE_CLIENT_SECRET'],
        message: 'Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither.',
      });
  });

export type Config = z.output<typeof configSchema>;

export function readConfig(source: Record<string, string | undefined>): Config {
  const result = configSchema.safeParse(source);

  if (!result.success) throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);

  return result.data;
}
