import { authRoutes, createAuth } from '@starfall-kit/auth';
import { drizzleAdapter } from '@starfall-kit/auth/drizzle';
import { google } from '@starfall-kit/auth/google';
import { socialRoutes } from '@starfall-kit/auth/social';
import { steam } from '@starfall-kit/auth/steam';

import { accounts, sessions, tokens, users } from '~/database/schema/auth';
import { fillProfile } from '~/utils/profile';

import type { Context } from 'hono';
import type { AppDependencies } from '~/types/AppDependencies';

type AuthDependencies = AppDependencies & { clientIP: (c: Context) => string | undefined };

export function createAppAuth({
  config,
  db,
  mailer,
  rateLimitStore,
  nonceStore,
  clientIP,
}: AuthDependencies) {
  const auth = createAuth({
    adapter: drizzleAdapter(db, { users, accounts, sessions, tokens }),
    clientIP,
  });

  const routes = authRoutes(auth, {
    rateLimit: { store: rateLimitStore, identify: clientIP },
    async onVerificationRequested({ user, token }) {
      const sent = await mailer.send('verifyEmail', user.email, { token });

      if (!sent.ok) console.error('Verification email failed', sent);
    },
    async onPasswordResetRequested({ user, token }) {
      const sent = await mailer.send('resetPassword', user.email, { token });

      if (!sent.ok) console.error('Password reset email failed', sent);
    },
  });

  const providers = [
    ...(config.GOOGLE_CLIENT_ID !== undefined && config.GOOGLE_CLIENT_SECRET !== undefined
      ? [
          google({
            clientID: config.GOOGLE_CLIENT_ID,
            clientSecret: config.GOOGLE_CLIENT_SECRET,
            onSignIn: ({ userID, profile }) =>
              fillProfile(db, userID, { displayName: profile.name, avatarURL: profile.picture }),
          }),
        ]
      : []),
    ...(config.STEAM_API_KEY !== undefined
      ? [
          steam({
            apiKey: config.STEAM_API_KEY,
            nonceStore,
            onSignIn: ({ userID, profile }) =>
              profile
                ? fillProfile(db, userID, {
                    displayName: profile.personaName,
                    avatarURL: profile.avatarFull,
                  })
                : undefined,
          }),
        ]
      : []),
  ];

  const social =
    providers.length > 0
      ? socialRoutes(auth, {
          providers,
          routesURL: new URL('/api/auth/social', config.FRONTEND_URL).toString(),
          frontendURL: config.FRONTEND_URL,
          secret: config.AUTH_SECRET,
        })
      : null;

  return { auth, routes, social };
}

export type AppAuth = ReturnType<typeof createAppAuth>['auth'];
