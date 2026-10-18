import { randomUUID } from 'node:crypto';

// Asigna un identificador a cada petición para poder rastrearla en los logs y en las respuestas.
export function requestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
