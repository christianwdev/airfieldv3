import { eq, sql } from 'drizzle-orm';

import { users } from '~/database/schema/auth';
import { DISPLAY_NAME_MAX_LENGTH } from '~/schemas/displayName';

import type { Database } from '~/types/Database';
import type { SessionUser } from '~/types/User';

export type ProviderProfile = { displayName: string | null; avatarURL: string | null };

function httpsURL(value: string | null): string | null {
  if (value === null || !URL.canParse(value)) return null;

  const url = new URL(value);

  return url.protocol === 'https:' ? url.toString() : null;
}

export function toProfile(user: Pick<SessionUser, 'displayName' | 'avatarURL'>) {
  return { displayName: user.displayName, avatarURL: user.avatarURL };
}

export async function fillProfile(db: Database, userID: string, profile: ProviderProfile) {
  const displayName = profile.displayName?.trim().slice(0, DISPLAY_NAME_MAX_LENGTH) || null;
  const avatarURL = httpsURL(profile.avatarURL);

  if (displayName === null && avatarURL === null) return;

  await db
    .update(users)
    .set({
      displayName: sql`coalesce(${users.displayName}, ${displayName})`,
      avatarURL: sql`coalesce(${users.avatarURL}, ${avatarURL})`,
    })
    .where(eq(users.id, userID));
}
