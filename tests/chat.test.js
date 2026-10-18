import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { appWith, fakeGemini, machine } from './helpers.js';

describe('POST /api/chat', () => {
  it('responde una aclaración sin plan nuevo', async () => {
    const gemini = fakeGemini(() => ({ data: { reply: 'Cierra la válvula roja a tu derecha.' }, model: 'm' }));
    const res = await request(appWith(gemini))
      .post('/api/chat')
      .send({
        machine,
        steps: [{ title: 'Cierra la válvula' }],
        currentStep: 0,
        message: '¿cuál válvula?',
        history: [{ role: 'assistant', text: 'Paso uno.' }],
      });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('Cierra la válvula roja a tu derecha.');
    expect(res.body.steps).toBeUndefined();
    expect(gemini.calls[0].prompt).toContain('¿cuál válvula?');
    expect(gemini.calls[0].prompt).toContain('1. Cierra la válvula');
  });

  it('devuelve un plan nuevo cuando el trabajador describe otro problema', async () => {
    const gemini = fakeGemini(() => ({
      data: {
        reply: 'Entendido, revisemos la fuga.',
        severity: 'high',
        escalate: true,
        steps: [{ title: 'Detén la prensa', voice: 'Detén la prensa.' }],
      },
      model: 'm',
    }));
    const res = await request(appWith(gemini)).post('/api/chat').send({ machine, message: 'gotea aceite' });
    expect(res.body.steps).toEqual([{ id: 1, title: 'Detén la prensa', voice: 'Paso uno. Detén la prensa.' }]);
    expect(res.body.escalate).toBe(true);
  });

  it('valida el mensaje', async () => {
    const app = appWith(fakeGemini(() => ({})));
    expect((await request(app).post('/api/chat').send({ machine, message: '' })).status).toBe(400);
    expect((await request(app).post('/api/chat').send({ machine })).status).toBe(400);
  });
});
