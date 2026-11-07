import { z } from 'zod';
export const turnSchema = z.object({
  id: z.string().min(1).max(100), role: z.enum(['user', 'assistant']), text: z.string().max(12000), phase: z.enum(['warmup', 'argument', 'challenge', 'transfer']), status: z.enum(['partial', 'final', 'interrupted']),
  questionId: z.string().max(100).optional(), questionEndMs: z.number().finite().min(0).max(3600000).optional(), startMs: z.number().finite().min(0).max(3600000).optional(), endMs: z.number().finite().min(0).max(3600000).optional(), unreliable: z.boolean().optional(),
});
export const transcriptSchema = z.array(turnSchema).max(100).refine(turns => new Set(turns.map(t => t.id)).size === turns.length, 'Doppelte Nachrichtenkennung');
export const chatSchema = z.object({ turns: transcriptSchema, elapsedMs: z.number().min(0).max(660000), requestId: z.string().uuid() });
