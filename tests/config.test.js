import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('aplica valores por defecto', () => {
    const c = loadConfig({});
    expect(c.port).toBe(3001);
    expect(c.gemini.model).toBe('gemini-3.5-flash-lite');
    expect(c.gemini.fallbackModels).toEqual(['gemini-3.5-flash', 'gemini-flash-latest']);
    expect(c.gemini.apiKey).toBeUndefined();
    expect(c.corsOrigins).toEqual(['*']);
  });

  it('trata variables vacías como no definidas', () => {
    const c = loadConfig({ GEMINI_API_KEY: '', PORT: '' });
    expect(c.gemini.apiKey).toBeUndefined();
    expect(c.port).toBe(3001);
  });

  it('lee listas separadas por comas', () => {
    const c = loadConfig({
      CORS_ORIGINS: ' https://a.com , https://b.com ',
      GEMINI_FALLBACK_MODELS: 'm1',
    });
    expect(c.corsOrigins).toEqual(['https://a.com', 'https://b.com']);
    expect(c.gemini.fallbackModels).toEqual(['m1']);
  });

  it('falla con un mensaje claro si algo es inválido', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Configuración inválida/);
    expect(() => loadConfig({ NODE_ENV: 'otro' })).toThrow(/NODE_ENV/);
  });
});
