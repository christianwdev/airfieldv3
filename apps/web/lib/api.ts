import { createServerClient } from '@starfall-kit/client/next';
import type { AppType } from '@airfieldtemp/api';

export const api = createServerClient<AppType>(process.env.API_URL ?? 'http://localhost:6060');
