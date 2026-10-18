// Entrada para plataformas serverless (preset Express de Vercel): exporta la app ya construida.
// Vercel exige que el archivo de entrada importe `express` de forma explícita, por eso la
// instancia se crea aquí y se le pasa a la fábrica. Para ejecución local usa src/server.js.
import express from 'express';
import { createApp } from './createApp.js';
import { loadConfig } from './config.js';

export default createApp({ config: loadConfig(), app: express() });
