import { z } from 'zod';

export const DISPLAY_NAME_MAX_LENGTH = 64;

export const displayNameSchema = z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH);
