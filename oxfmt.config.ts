import { formatting } from '@starfall-kit/config/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...formatting,
  ignorePatterns: [...(formatting.ignorePatterns ?? []), 'apps/api/drizzle/**'],
});
