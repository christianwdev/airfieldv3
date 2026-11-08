import { createId } from '@paralleldrive/cuid2';
import { index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const gameTypeEnum = pgEnum('game_type', ['roulette', 'case_open', 'battle', 'upgrader']);

export const gameStatusEnum = pgEnum('game_status', [
  'open',
  'awaiting_seed',
  'rolling',
  'ended',
  'cancelled',
]);

export const games = pgTable(
  'games',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),

    type: gameTypeEnum('type').notNull(),
    status: gameStatusEnum('status').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [
    index('games_type_created_idx').on(table.type, table.createdAt.desc()),
  ],
);

export type InternalGame = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
