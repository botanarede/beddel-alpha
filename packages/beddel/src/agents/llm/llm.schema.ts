/**
 * LLM Agent Schema - Zod validation schemas
 * Safe for both client and server
 */

import { z } from 'zod';

export const LlmInputSchema = z.object({
  query: z.string().min(1),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
  temperature: z.number().min(0).max(2).optional(),
  systemPrompt: z.string().optional(),
});

export const LlmOutputSchema = z.object({
  response: z.string(),
  timestamp: z.string().optional(),
  error: z.string().optional(),
});

export type LlmInput = z.infer<typeof LlmInputSchema>;
export type LlmOutput = z.infer<typeof LlmOutputSchema>;
