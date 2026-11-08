import { drizzle } from 'drizzle-orm/bun-sql';

export function createDatabase(url: string) {
  return drizzle(url);
}
