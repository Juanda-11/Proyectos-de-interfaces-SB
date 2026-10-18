// Logger mínimo en JSON (una línea por evento), apto para los logs de Vercel. Silencioso en pruebas.
export function createLogger({ level = 'info', silent = false } = {}) {
  const order = { debug: 10, info: 20, warn: 30, error: 40 };
  const write = (lvl, msg, extra) => {
    if (silent || order[lvl] < order[level]) return;
    const line = JSON.stringify({ time: new Date().toISOString(), level: lvl, msg, ...extra });
    (lvl === 'error' || lvl === 'warn' ? console.error : console.log)(line);
  };
  return {
    debug: (msg, extra) => write('debug', msg, extra),
    info: (msg, extra) => write('info', msg, extra),
    warn: (msg, extra) => write('warn', msg, extra),
    error: (msg, extra) => write('error', msg, extra),
  };
}
