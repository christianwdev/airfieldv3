import { bun, reactFiles } from '@starfall-kit/config/oxlint';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [bun],
  overrides: [reactFiles(['apps/web/**/*.{ts,tsx}'])],
});
