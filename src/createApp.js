import express from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { aiRateLimiter } from './middleware/rateLimit.js';
import { requestId } from './middleware/requestId.js';
import { assistantRouter } from './routes/assistant.js';
import { healthRouter } from './routes/health.js';
import { createAssistant } from './services/assistant.js';
import { createGeminiClient } from './services/gemini.js';
import { createLogger } from './lib/logger.js';

export const VERSION = '1.0.0';

/**
 * Crea la aplicación Express. Las dependencias (cliente de Gemini, logger) se pueden inyectar
 * para probar sin llamar a la API real.
 */
export function createApp({
  config,
  gemini = createGeminiClient(config.gemini),
  logger = createLogger({ silent: config.env === 'test' }),
  app = express(),
}) {
  const assistant = createAssistant(gemini);

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // detrás del proxy de Vercel: IP real del cliente para el rate limit

  app.use(requestId);
  app.use(helmet());
  app.use(corsMiddleware(config.corsOrigins));
  app.use(express.json({ limit: '16kb' }));

  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      logger.info('request', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - started,
      });
    });
    next();
  });

  app.get('/', (_req, res) => {
    res.json({ name: 'WorkerWatch API', version: VERSION, docs: '/api/health' });
  });

  const rateLimiter = aiRateLimiter(config.rateLimitPerMinute);
  app.use('/api', healthRouter({ gemini, version: VERSION }));
  app.use('/api', assistantRouter({ assistant, rateLimiter }));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
