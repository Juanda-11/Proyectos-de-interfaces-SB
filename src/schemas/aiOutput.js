import { z } from 'zod';

// Lo que esperamos que devuelva Gemini (se valida y se normaliza antes de responder al reloj).
const rawStep = z.object({ title: z.string(), voice: z.string().optional() });

export const rawPlanSchema = z.object({
  summary: z.string().default(''),
  severity: z.enum(['medium', 'high', 'critical']).catch('medium'),
  escalate: z.boolean().catch(false),
  steps: z.array(rawStep).min(1).max(8),
});

export const rawChatSchema = z.object({
  reply: z.string().min(1),
  severity: z.enum(['medium', 'high', 'critical']).catch('medium').optional(),
  escalate: z.boolean().catch(false).optional(),
  steps: z.array(rawStep).max(8).optional(),
});

// Esquemas de respuesta para Gemini (subconjunto OpenAPI que admite responseSchema).
const stepsSchema = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING', description: 'Instrucción en imperativo, máximo 32 caracteres' },
      voice: {
        type: 'STRING',
        description: 'Frase corta para decir en voz alta, máximo 25 palabras',
      },
    },
    required: ['title', 'voice'],
  },
};

export const geminiPlanSchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING', description: 'Qué ocurre, máximo 8 palabras' },
    severity: { type: 'STRING', enum: ['medium', 'high', 'critical'] },
    escalate: {
      type: 'BOOLEAN',
      description: 'true si debe avisar a un supervisor o mantenimiento',
    },
    steps: stepsSchema,
  },
  required: ['summary', 'severity', 'escalate', 'steps'],
};

export const geminiChatSchema = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING', description: 'Respuesta hablada de máximo 35 palabras' },
    severity: { type: 'STRING', enum: ['medium', 'high', 'critical'] },
    escalate: { type: 'BOOLEAN' },
    steps: { ...stepsSchema, description: 'Solo si el trabajador describe un problema nuevo' },
  },
  required: ['reply'],
};
