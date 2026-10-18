import { rateLimit } from 'express-rate-limit';

// Protege la cuota gratuita de Gemini. En Vercel el contador vive por instancia (mejor esfuerzo).
export function aiRateLimiter(limitPerMinute) {
  return rateLimit({
    windowMs: 60_000,
    limit: limitPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'rate_limited',
          message: 'Demasiadas solicitudes, espera un momento',
          requestId: req.id,
        },
      });
    },
  });
}
