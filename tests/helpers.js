import { createApp } from '../src/createApp.js';
import { loadConfig } from '../src/config.js';

export const baseConfig = (overrides = {}) =>
  loadConfig({ NODE_ENV: 'test', GEMINI_API_KEY: 'test-key-123456', ...overrides });

// Cliente de Gemini falso: devuelve lo que se le indique sin salir a la red.
export function fakeGemini(handler) {
  const calls = [];
  return {
    isConfigured: true,
    model: 'fake-model',
    calls,
    async generateJson(args) {
      calls.push(args);
      return handler(args);
    },
  };
}

export const appWith = (gemini, overrides) => createApp({ config: baseConfig(overrides), gemini });

export const machine = { typeId: 'boiler', typeLabel: 'Caldera', name: 'Caldera #04' };
