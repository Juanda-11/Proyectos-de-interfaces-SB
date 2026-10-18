import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { appWith, fakeGemini, machine } from './helpers.js';

const gemini = () =>
  fakeGemini(() => ({
    data: {
      summary: 's',
      severity: 'medium',
      escalate: false,
      steps: [{ title: 'a', voice: 'b' }],
    },
    model: 'm',
  }));

describe('CORS', () => {
  it('permite cualquier origen con "*"', async () => {
    const res = await request(appWith(gemini()))
      .get('/api/health')
      .set('Origin', 'https://otro.com');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('solo permite orígenes de la lista, con comodines de subdominio', async () => {
    const app = appWith(gemini(), { CORS_ORIGINS: 'https://app.com,https://*.vercel.app' });
    const allowed = await request(app).get('/api/health').set('Origin', 'https://app.com');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.com');
    const preview = await request(app)
      .get('/api/health')
      .set('Origin', 'https://ww-git-main-juanda.vercel.app');
    expect(preview.headers['access-control-allow-origin']).toBe(
      'https://ww-git-main-juanda.vercel.app'
    );
    const blocked = await request(app).get('/api/health').set('Origin', 'https://malo.com');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
    const spoof = await request(app)
      .get('/api/health')
      .set('Origin', 'https://x.vercel.app.malo.com');
    expect(spoof.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('permite peticiones sin Origin (apps nativas)', async () => {
    const app = appWith(gemini(), { CORS_ORIGINS: 'https://app.com' });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});

describe('límite de peticiones', () => {
  it('responde 429 al superar el máximo por minuto', async () => {
    const app = appWith(gemini(), { RATE_LIMIT_PER_MINUTE: '2' });
    const send = () => request(app).post('/api/diagnose').send({ machine, description: 'x' });
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const limited = await send();
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('rate_limited');
  });
});

describe('tamaño del cuerpo', () => {
  it('rechaza cuerpos mayores a 16 KB', async () => {
    const res = await request(appWith(gemini()))
      .post('/api/diagnose')
      .send({ machine, description: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });
});
