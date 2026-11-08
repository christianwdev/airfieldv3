import { validate } from '@starfall-kit/hono';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { users } from '~/database/schema/auth';
import { displayNameSchema } from '~/schemas/displayName';
import { toProfile } from '~/utils/profile';
import { sendError, sendResponse } from '~/utils/response';

import type { Database } from '~/types/Database';
import type { AppAuth } from '~/utils/auth';

const profilePatchSchema = z.object({ displayName: displayNameSchema.nullable() });

export default function createProfileRoutes({ auth, db }: { auth: AppAuth; db: Database }) {
  return new Hono()
    .get('/', auth.requireAuth(), c =>
      sendResponse({ c, data: { profile: toProfile(c.get('user')) } }),
    )
    .patch(
      '/',
      auth.requireAuth(),
      auth.csrfProtection(),
      validate('json', profilePatchSchema),
      async c => {
        const [updated] = await db
          .update(users)
          .set({ displayName: c.req.valid('json').displayName })
          .where(eq(users.id, c.get('user').id))
          .returning({ displayName: users.displayName, avatarURL: users.avatarURL });

        if (!updated) return sendError({ c, error: 'userNotFound' });

        return sendResponse({ c, data: { profile: updated }, message: 'Profile saved.' });
      },
    );
}
