import { sql } from 'drizzle-orm';
import { Hono } from 'hono';

import { sendError, sendResponse } from '~/utils/response';

import type { Database } from '~/types/Database';

export default function createHealthRoutes(db: Database) {
  return new Hono().get('/', async c => {
    const reachable = await db.execute(sql`select 1`).then(
      () => true,
      () => false,
    );

    if (!reachable) return sendError({ c, error: 'databaseUnavailable' });

    return sendResponse({ c, data: { status: 'ok' } });
  });
}
