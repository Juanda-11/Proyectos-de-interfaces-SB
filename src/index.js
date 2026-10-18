// Entrada para plataformas serverless (preset Express de Vercel): exporta la app ya construida.
// Para ejecución local con servidor propio usa src/server.js.
import { createApp } from './createApp.js';
import { loadConfig } from './config.js';

export default createApp({ config: loadConfig() });
