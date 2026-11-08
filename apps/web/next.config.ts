import path from 'node:path';

import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

const root = path.resolve(import.meta.dirname, '../..');

loadEnvConfig(root);

const apiURL = (process.env.API_URL ?? 'http://localhost:6060').replace(/\/+$/, '');

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  turbopack: { root },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiURL}/:path*` }];
  },
};

export default config;
