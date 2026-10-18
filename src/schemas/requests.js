import { z } from 'zod';

const text = (max) => z.string().trim().min(1).max(max);

export const machineSchema = z.object({
  typeId: text(40),
  typeLabel: text(60),
  name: text(60),
});

export const faultSchema = z.object({
  title: text(80),
  metric: z.string().trim().max(60).optional(),
  reading: z.string().trim().max(40).optional(),
});

const stepRefSchema = z.object({ title: text(80) });

export const diagnoseRequestSchema = z
  .object({
    machine: machineSchema,
    fault: faultSchema.nullish(),
    description: z.string().trim().max(400).optional(),
    language: z.literal('es').default('es'),
  })
  .refine((v) => v.fault || v.description, {
    message: 'Indica una falla (fault) o una descripción (description)',
    path: ['fault'],
  });

export const chatRequestSchema = z.object({
  machine: machineSchema,
  fault: faultSchema.nullish(),
  steps: z.array(stepRefSchema).max(8).optional(),
  currentStep: z.number().int().min(0).max(7).optional(),
  message: text(400),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: text(600) }))
    .max(8)
    .optional(),
  language: z.literal('es').default('es'),
});
