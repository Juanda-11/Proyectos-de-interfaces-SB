import {
  rawChatSchema,
  rawPlanSchema,
  geminiChatSchema,
  geminiPlanSchema,
} from '../schemas/aiOutput.js';
import { errors } from '../lib/errors.js';
import { SYSTEM_PROMPT, buildChatPrompt, buildDiagnosePrompt } from './prompts.js';

const NUMBER_WORDS = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho'];
const MAX_TITLE = 40;
const MAX_VOICE = 240;
const MAX_REPLY = 280;

const clip = (text, max) => {
  const t = String(text).replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
};

// Garantiza que cada paso tenga título corto y una frase hablada que empiece con "Paso N."
export function normalizeSteps(rawSteps) {
  return rawSteps.slice(0, 6).map((step, i) => {
    const title = clip(step.title.replace(/^\s*(paso\s+\w+[.:]?\s*|\d+[.)]\s*)/i, ''), MAX_TITLE);
    let voice = clip(step.voice?.trim() || title, MAX_VOICE);
    if (!/^paso\b/i.test(voice)) voice = `Paso ${NUMBER_WORDS[i]}. ${voice}`;
    return { id: i + 1, title, voice };
  });
}

const parse = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) throw errors.aiInvalidResponse(result.error);
  return result.data;
};

// Evita que el trabajador cierre el delimitador del prompt con comillas triples.
const defang = (text) => text.replaceAll('"""', "'''");

/** Casos de uso del asistente. Recibe un cliente de Gemini (inyectable para pruebas). */
export function createAssistant(gemini) {
  return {
    async diagnose(input) {
      const { data, model } = await gemini.generateJson({
        system: SYSTEM_PROMPT,
        prompt: buildDiagnosePrompt({
          ...input,
          description: input.description ? defang(input.description) : undefined,
        }),
        schema: geminiPlanSchema,
      });
      const plan = parse(rawPlanSchema, data);
      return {
        summary: clip(plan.summary || input.fault?.title || 'Plan de reparación', 60),
        severity: plan.severity,
        escalate: plan.escalate || plan.severity === 'critical',
        steps: normalizeSteps(plan.steps),
        source: 'gemini',
        model,
      };
    },

    async chat(input) {
      const { data, model } = await gemini.generateJson({
        system: SYSTEM_PROMPT,
        prompt: buildChatPrompt({ ...input, message: defang(input.message) }),
        schema: geminiChatSchema,
        temperature: 0.4,
      });
      const chat = parse(rawChatSchema, data);
      const response = { reply: clip(chat.reply, MAX_REPLY), source: 'gemini', model };
      if (chat.steps?.length) {
        response.steps = normalizeSteps(chat.steps);
        response.severity = chat.severity ?? 'medium';
        response.escalate = Boolean(chat.escalate) || chat.severity === 'critical';
      }
      return response;
    },
  };
}
