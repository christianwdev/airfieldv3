import { defineErrors } from '@starfall-kit/hono';

const ErrorCodes = defineErrors({
  databaseUnavailable: { message: 'The database is unavailable.', httpCode: 503 },
  userNotFound: { message: 'That account no longer exists.', httpCode: 404 },
});

export default ErrorCodes;
