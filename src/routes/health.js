import { Router } from 'express';

export function healthRouter({ gemini, version }) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version,
      ai: gemini.isConfigured ? 'configured' : 'missing-key',
      model: gemini.model,
      uptime: Math.round(process.uptime()),
    });
  });

  return router;
}
