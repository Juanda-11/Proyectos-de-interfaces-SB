import cors from 'cors';

// Convierte "https://*.vercel.app" en una expresión regular segura.
function toMatcher(pattern) {
  if (!pattern.includes('*')) return (origin) => origin === pattern;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+');
  const regex = new RegExp(`^${escaped}$`, 'i');
  return (origin) => regex.test(origin);
}

export function corsMiddleware(allowedOrigins) {
  if (allowedOrigins.includes('*')) return cors();
  const matchers = allowedOrigins.map(toMatcher);
  return cors({
    origin: (origin, callback) => {
      // Sin cabecera Origin (curl, apps nativas como el APK del reloj): se permite.
      if (!origin) return callback(null, true);
      callback(
        null,
        matchers.some((match) => match(origin))
      );
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 600,
  });
}
