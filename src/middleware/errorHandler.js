import { ZodError } from 'zod';
import { AppError, errors } from '../lib/errors.js';

export function notFoundHandler(_req, _res, next) {
  next(errors.notFound());
}

// Respuesta de error uniforme: { error: { code, message, requestId, details? } }
export function errorHandler(logger) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, _next) => {
    let status = 500;
    let code = 'internal_error';
    let message = 'Error interno del servidor';
    let details;

    if (err instanceof ZodError) {
      status = 400;
      code = 'invalid_request';
      message = 'Petición inválida';
      details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    } else if (err instanceof AppError) {
      ({ status, code, message } = err);
      details = err.details;
    } else if (err?.type === 'entity.parse.failed') {
      status = 400;
      code = 'invalid_json';
      message = 'El cuerpo no es JSON válido';
    } else if (err?.type === 'entity.too.large') {
      status = 413;
      code = 'payload_too_large';
      message = 'El cuerpo de la petición es demasiado grande';
    }

    const log = status >= 500 ? logger.error : logger.warn;
    log(message, { requestId: req.id, code, status, cause: err?.cause?.message ?? err?.message });

    res.status(status).json({ error: { code, message, requestId: req.id, ...(details ? { details } : {}) } });
  };
}
