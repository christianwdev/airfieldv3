import path from 'node:path';

import { migrate } from 'drizzle-orm/bun-sql/migrator';
import { z } from 'zod';

import { createDatabase } from '~/database/database';

const db = createDatabase(z.url().parse(process.env.DATABASE_URL));

await migrate(db, { migrationsFolder: path.join(import.meta.dir, '..', 'drizzle') });
await db.$client.close();

console.log('Migrations applied');
