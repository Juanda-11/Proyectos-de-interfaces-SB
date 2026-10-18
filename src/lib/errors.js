// Error de aplicación con código estable para que el cliente pueda reaccionar (p. ej. usar su modo offline).
export class AppError extends Error {
  constructor(status, code, message, { cause } = {}) {
    super(message, { cause });
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export const errors = {
  badRequest: (message, details) => Object.assign(new AppError(400, 'invalid_request', message), { details }),
  notFound: () => new AppError(404, 'not_found', 'Ruta no encontrada'),
  aiNotConfigured: () =>
    new AppError(503, 'ai_not_configured', 'La IA no está configurada en el servidor (falta GEMINI_API_KEY)'),
  aiRateLimited: () => new AppError(429, 'ai_rate_limited', 'La IA está recibiendo demasiadas solicitudes, intenta en unos segundos'),
  aiTimeout: () => new AppError(504, 'ai_timeout', 'La IA tardó demasiado en responder'),
  aiBlocked: () => new AppError(422, 'ai_blocked', 'La IA no pudo responder a esta consulta'),
  aiUpstream: (cause) => new AppError(502, 'ai_upstream_error', 'Error al consultar la IA', { cause }),
  aiInvalidResponse: (cause) => new AppError(502, 'ai_invalid_response', 'La IA devolvió una respuesta inválida', { cause }),
};
