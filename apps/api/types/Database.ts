import type { PgAsyncDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { AnyRelations } from 'drizzle-orm/relations';

export type Database = PgAsyncDatabase<PgQueryResultHKT, AnyRelations>;
