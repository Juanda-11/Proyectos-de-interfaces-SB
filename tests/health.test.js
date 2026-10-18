import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { appWith, fakeGemini } from './helpers.js';

describe('GET /api/health', () => {
  it('informa el estado y si la IA está configurada', async () => {
    const res = await request(appWith(fakeGemini(() => ({})))).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', ai: 'configured', model: 'fake-model' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('avisa cuando falta la clave de Gemini', async () => {
    const gemini = { ...fakeGemini(() => ({})), isConfigured: false };
    const res = await request(appWith(gemini)).get('/api/health');
    expect(res.body.ai).toBe('missing-key');
  });

  it('responde 404 en JSON para rutas desconocidas', async () => {
    const res = await request(appWith(fakeGemini(() => ({})))).get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('incluye cabeceras de seguridad de helmet', async () => {
    const res = await request(appWith(fakeGemini(() => ({})))).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
