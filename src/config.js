import { z } from 'zod';

const emptyToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(3001)),
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
  GEMINI_MODEL: z.preprocess(emptyToUndefined, z.string().default('gemini-flash-latest')),
  GEMINI_FALLBACK_MODELS: z.preprocess(
    emptyToUndefined,
    z.string().default('gemini-2.5-flash,gemini-2.5-flash-lite')
  ),
  GEMINI_TIMEOUT_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(20000)),
  CORS_ORIGINS: z.preprocess(emptyToUndefined, z.string().default('*')),
  RATE_LIMIT_PER_MINUTE: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(30)),
});

const list = (value) =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Lee y valida las variables de entorno. Lanza un error legible si algo es inválido. */
export function loadConfig(env = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${detail}`);
  }
  const e = parsed.data;
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    gemini: {
      apiKey: e.GEMINI_API_KEY,
      model: e.GEMINI_MODEL,
      fallbackModels: list(e.GEMINI_FALLBACK_MODELS),
      timeoutMs: e.GEMINI_TIMEOUT_MS,
    },
    corsOrigins: list(e.CORS_ORIGINS),
    rateLimitPerMinute: e.RATE_LIMIT_PER_MINUTE,
  };
}
