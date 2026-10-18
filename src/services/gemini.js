import { errors } from '../lib/errors.js';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Códigos con los que vale la pena probar el siguiente modelo de respaldo.
const RETRY_WITH_NEXT_MODEL = new Set([404, 429, 500, 502, 503, 504]);

function extractText(data) {
  if (data?.promptFeedback?.blockReason) throw errors.aiBlocked();
  const candidate = data?.candidates?.[0];
  if (!candidate) throw errors.aiInvalidResponse(new Error('Sin candidatos'));
  if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'PROHIBITED_CONTENT') {
    throw errors.aiBlocked();
  }
  const text = (candidate.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text)
    throw errors.aiInvalidResponse(new Error(`Respuesta vacía (${candidate.finishReason})`));
  return text;
}

function parseJson(text) {
  // Algunos modelos envuelven el JSON en ```json ... ``` aunque se pida application/json.
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(clean);
  } catch (cause) {
    throw errors.aiInvalidResponse(cause);
  }
}

/**
 * Cliente mínimo de la API REST de Gemini (sin SDK: menos dependencias y arranque más rápido).
 * Prueba el modelo principal y, si no está disponible o está saturado, los de respaldo.
 */
export function createGeminiClient({
  apiKey,
  model,
  fallbackModels = [],
  timeoutMs = 20000,
  fetchImpl = globalThis.fetch,
  baseUrl = BASE_URL,
}) {
  const models = [model, ...fallbackModels.filter((m) => m !== model)];

  async function callModel(name, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${baseUrl}/models/${encodeURIComponent(name)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        const err = Object.assign(new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`), {
          upstreamStatus: res.status,
        });
        throw err;
      }
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') throw Object.assign(new Error('timeout'), { timeout: true });
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    isConfigured: Boolean(apiKey),
    model,

    /** Genera una respuesta JSON validada por `responseSchema`. Devuelve { data, model }. */
    async generateJson({ system, prompt, schema, temperature = 0.3 }) {
      if (!apiKey) throw errors.aiNotConfigured();

      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      };

      let lastError;
      for (const name of models) {
        try {
          const data = await callModel(name, body);
          return { data: parseJson(extractText(data)), model: name };
        } catch (e) {
          lastError = e;
          if (e.timeout) continue; // un modelo lento: probar el siguiente
          if (e.upstreamStatus && RETRY_WITH_NEXT_MODEL.has(e.upstreamStatus)) continue;
          if (e.name === 'AppError') throw e;
          throw errors.aiUpstream(e);
        }
      }

      if (lastError?.timeout) throw errors.aiTimeout();
      if (lastError?.upstreamStatus === 429) throw errors.aiRateLimited();
      throw errors.aiUpstream(lastError);
    },
  };
}
