import { createClientIP, createErrorHandler, notFoundHandler } from '@starfall-kit/hono';
import { Hono } from 'hono';

import createHealthRoutes from './health';
import createProfileRoutes from './profile';

import { createAppAuth } from '~/utils/auth';

import type { AppDependencies } from '~/types/AppDependencies';

export default function createRoutes(dependencies: AppDependencies) {
  const clientIP = createClientIP(dependencies.config.CLIENT_IP_SOURCE);
  const { auth, routes, social } = createAppAuth({ ...dependencies, clientIP });

  const app = new Hono()
    .use(auth.csrfProtection())
    .route('/health', createHealthRoutes(dependencies.db))
    .route('/auth', routes)
    .route('/profile', createProfileRoutes({ auth, db: dependencies.db }));

  if (social) app.route('/auth/social', social);

  app.notFound(notFoundHandler);
  app.onError(createErrorHandler());

  return app;
}
