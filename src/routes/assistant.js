import { Router } from 'express';
import { chatRequestSchema, diagnoseRequestSchema } from '../schemas/requests.js';

export function assistantRouter({ assistant, rateLimiter }) {
  const router = Router();

  // Plan de reparación a partir de una alerta del sensor o de la descripción del trabajador
  router.post('/diagnose', rateLimiter, async (req, res) => {
    const input = diagnoseRequestSchema.parse(req.body);
    res.json(await assistant.diagnose(input));
  });

  // Pregunta de seguimiento (repetir un paso, aclarar, o describir un problema nuevo)
  router.post('/chat', rateLimiter, async (req, res) => {
    const input = chatRequestSchema.parse(req.body);
    res.json(await assistant.chat(input));
  });

  return router;
}
