import { describe, expect, it, vi } from 'vitest';
import { createGeminiClient } from '../src/services/gemini.js';

const ok = (obj) => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(obj) }] } }],
  }),
});
const fail = (status, body = 'error') => ({ ok: false, status, text: async () => body });

const args = { system: 's', prompt: 'p', schema: { type: 'OBJECT' } };
const make = (fetchImpl, extra = {}) =>
  createGeminiClient({
    apiKey: 'key-1234567890',
    model: 'primary',
    fallbackModels: ['backup'],
    fetchImpl,
    ...extra,
  });

describe('createGeminiClient', () => {
  it('envía la petición con clave en cabecera y esquema JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ a: 1 }));
    const result = await make(fetchImpl).generateJson(args);

    expect(result).toEqual({ data: { a: 1 }, model: 'primary' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('/models/primary:generateContent');
    expect(url).not.toContain('key=');
    expect(init.headers['x-goog-api-key']).toBe('key-1234567890');
    const body = JSON.parse(init.body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema).toEqual({ type: 'OBJECT' });
    expect(body.systemInstruction.parts[0].text).toBe('s');
  });

  it('usa el modelo de respaldo si el principal está saturado', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fail(503))
      .mockResolvedValueOnce(ok({ b: 2 }));
    const result = await make(fetchImpl).generateJson(args);
    expect(result.model).toBe('backup');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('usa el modelo de respaldo si el principal no existe (404)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fail(404))
      .mockResolvedValueOnce(ok({ b: 2 }));
    expect((await make(fetchImpl).generateJson(args)).model).toBe('backup');
  });

  it('no reintenta con errores de clave (401/403)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fail(403, 'API key not valid'));
    await expect(make(fetchImpl).generateJson(args)).rejects.toMatchObject({
      code: 'ai_upstream_error',
      status: 502,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('responde 429 si todos los modelos están limitados', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fail(429));
    await expect(make(fetchImpl).generateJson(args)).rejects.toMatchObject({
      code: 'ai_rate_limited',
      status: 429,
    });
  });

  it('responde 504 por tiempo de espera agotado', async () => {
    const fetchImpl = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('abort'), { name: 'AbortError' }))
          )
        )
    );
    await expect(make(fetchImpl, { timeoutMs: 10 }).generateJson(args)).rejects.toMatchObject({
      code: 'ai_timeout',
      status: 504,
    });
  });

  it('falla con 503 y código claro si no hay clave', async () => {
    const client = createGeminiClient({ model: 'primary', fetchImpl: vi.fn() });
    expect(client.isConfigured).toBe(false);
    await expect(client.generateJson(args)).rejects.toMatchObject({
      code: 'ai_not_configured',
      status: 503,
    });
  });

  it('interpreta JSON envuelto en bloque de código', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '```json\n{"c":3}\n```' }] } }],
      }),
    });
    expect((await make(fetchImpl).generateJson(args)).data).toEqual({ c: 3 });
  });

  it('rechaza texto que no es JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'hola' }] } }] }),
    });
    await expect(make(fetchImpl).generateJson(args)).rejects.toMatchObject({
      code: 'ai_invalid_response',
    });
  });

  it('traduce bloqueos de seguridad de Gemini', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }),
    });
    await expect(make(fetchImpl).generateJson(args)).rejects.toMatchObject({
      code: 'ai_blocked',
      status: 422,
    });
  });
});
