// Prueba de humo contra la IA real: verifica que la clave y el modelo funcionan.
//   GEMINI_API_KEY=... npm run smoke            (llama directamente a Gemini)
//   API_URL=https://tu-api.vercel.app npm run smoke   (prueba un despliegue)
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const body = {
  machine: { typeId: 'press', typeLabel: 'Prensa hidráulica', name: 'Prensa #02' },
  fault: { title: 'FUGA DE ACEITE', metric: 'Presión de aceite', reading: '72 bar' },
};

async function viaHttp(base) {
  const health = await (await fetch(`${base}/api/health`)).json();
  console.log('health:', health);
  const res = await fetch(`${base}/api/diagnose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function viaApp() {
  const config = loadConfig();
  if (!config.gemini.apiKey) throw new Error('Falta GEMINI_API_KEY (ver .env.example)');
  const server = createApp({ config }).listen(0);
  try {
    return await viaHttp(`http://localhost:${server.address().port}`);
  } finally {
    server.close();
  }
}

const { status, json } = process.env.API_URL
  ? await viaHttp(process.env.API_URL.replace(/\/+$/, ''))
  : await viaApp();

console.log('POST /api/diagnose →', status);
console.log(JSON.stringify(json, null, 2));
process.exit(status === 200 ? 0 : 1);
