import { createResponses } from '@starfall-kit/hono';

import ErrorCodes from '~/constants/ErrorCodes';

export const { sendResponse, sendError } = createResponses(ErrorCodes);
