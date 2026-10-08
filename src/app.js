const os = require('node:os');
const path = require('node:path');
const cors = require('cors');
const express = require('express');
const QRCode = require('qrcode');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./openapi');
const pkg = require('../package.json');
const tools = require('./tools');

const { badRequest, HttpError } = tools;

function bool(value, fallback) {
  if (value === undefined) return fallback;
  return !['false', '0', 'no', 'non'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n)) throw badRequest(`« ${value} » n'est pas un entier`);
  return n;
}

function createApp() {
  const app = express();
  const startedAt = new Date();
  const stats = { requests: 0, byRoute: {} };

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  // Compteur de requêtes en mémoire (le service reste sans état persistant)
  app.use((req, res, next) => {
    res.on('finish', () => {
      if (!req.path.startsWith('/api/')) return;
      stats.requests++;
      const key = `${req.method} ${req.route?.path ?? req.path}`;
      stats.byRoute[key] = (stats.byRoute[key] ?? 0) + 1;
    });
    next();
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/openapi.json', (req, res) => res.json(openapi));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Toolbox Service · API' }));

  // ---- Supervision ----
  app.get('/health', (req, res) => {
    res.json({ status: 'UP', uptimeSeconds: Math.round(process.uptime()) });
  });

  app.get('/api/info', (req, res) => {
    res.json({
      service: pkg.name,
      version: pkg.version,
      description: pkg.description,
      hostname: os.hostname(),
      node: process.version,
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      requestsServed: stats.requests,
      requestsByRoute: stats.byRoute,
      database: null,
    });
  });

  // ---- Outils ----
  app.get('/api/uuid', (req, res) => {
    res.json({ uuids: tools.generateUuids(int(req.query.count, 1)) });
  });

  app.get('/api/password', (req, res) => {
    res.json(
      tools.generatePassword({
        length: int(req.query.length, 16),
        uppercase: bool(req.query.uppercase, true),
        numbers: bool(req.query.numbers, true),
        symbols: bool(req.query.symbols, true),
      }),
    );
  });

  app.post('/api/hash', (req, res) => {
    const { text, algorithm = 'sha256', encoding = 'hex' } = req.body ?? {};
    res.json({ algorithm, encoding, hash: tools.hash(text, algorithm, encoding) });
  });

  app.post('/api/text/stats', (req, res) => {
    res.json(tools.textStats(req.body?.text));
  });

  app.post('/api/text/slugify', (req, res) => {
    res.json({ slug: tools.slugify(req.body?.text) });
  });

  app.get('/api/convert', (req, res) => {
    const { category, from, to } = req.query;
    res.json(tools.convert(category, Number(req.query.value), from, to));
  });

  app.get('/api/convert/units', (req, res) => {
    res.json(Object.fromEntries(Object.entries(tools.UNITS).map(([k, v]) => [k, Object.keys(v)])));
  });

  const qrcode = async (params, res) => {
    const text = params.text;
    if (typeof text !== 'string' || !text.length) throw badRequest('text est obligatoire');
    if (text.length > 1000) throw badRequest('text : 1000 caractères maximum');
    const size = int(params.size, 300);
    if (size < 100 || size > 1000) throw badRequest('size doit être entre 100 et 1000');
    const format = params.format ?? 'png';
    const options = {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: params.color ?? '#000000', light: '#ffffff' },
    };
    if (format === 'svg') {
      res.type('image/svg+xml').send(await QRCode.toString(text, { ...options, type: 'svg' }));
    } else if (format === 'png') {
      res.type('image/png').send(await QRCode.toBuffer(text, options));
    } else {
      throw badRequest('format doit être png ou svg');
    }
  };

  app.get('/api/qrcode', (req, res, next) => qrcode(req.query, res).catch(next));
  app.post('/api/qrcode', (req, res, next) => qrcode(req.body ?? {}, res).catch(next));

  // ---- Erreurs ----
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not Found', message: `Route inconnue : ${req.method} ${req.originalUrl}` });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') err = badRequest('JSON invalide');
    if (err.type === 'entity.too.large') err = new HttpError(413, 'Corps de requête trop volumineux (100 Ko max)');
    if (err.message?.startsWith('Invalid hex color')) err = badRequest('color doit être une couleur hexadécimale (#RRGGBB)');
    const status = err.status ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Internal Server Error' : 'Bad Request', message: err.message });
  });

  return app;
}

module.exports = { createApp };
