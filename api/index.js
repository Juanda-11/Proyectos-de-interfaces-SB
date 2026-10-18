// Punto de entrada serverless para Vercel: todas las rutas se reescriben hacia esta función.
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

export default createApp({ config: loadConfig() });
