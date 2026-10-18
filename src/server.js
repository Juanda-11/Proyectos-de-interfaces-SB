import app from './index.js';
import { loadConfig } from './config.js';

const config = loadConfig();

app.listen(config.port, () => {
  const ai = config.gemini.apiKey
    ? `Gemini (${config.gemini.model})`
    : 'SIN CLAVE: define GEMINI_API_KEY';
  console.log(`WorkerWatch API escuchando en http://localhost:${config.port} · IA: ${ai}`);
});
