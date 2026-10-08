const pkg = require('../package.json');

const error = { $ref: '#/components/responses/BadRequest' };
const json = schema => ({ 'application/json': { schema } });
const textBody = example => ({
  required: true,
  content: json({ type: 'object', required: ['text'], properties: { text: { type: 'string', example } } }),
});

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Toolbox Service',
    version: pkg.version,
    description:
      "Micro-service REST **sans base de données** et sans état : chaque réponse est calculée à la volée. " +
      'Il peut donc être déployé, redémarré ou répliqué librement.',
  },
  tags: [
    { name: 'Supervision' },
    { name: 'Générateurs' },
    { name: 'Texte' },
    { name: 'Conversions' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Supervision'],
        summary: 'Healthcheck',
        responses: { 200: { description: 'Service opérationnel', content: json({ type: 'object', example: { status: 'UP', uptimeSeconds: 42 } }) } },
      },
    },
    '/api/info': {
      get: { tags: ['Supervision'], summary: 'Informations sur l\'instance (version, hôte, uptime, compteur de requêtes)', responses: { 200: { description: 'OK' } } },
    },
    '/api/uuid': {
      get: {
        tags: ['Générateurs'],
        summary: 'Générer des UUID v4',
        parameters: [{ name: 'count', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 1 } }],
        responses: { 200: { description: 'OK', content: json({ type: 'object', example: { uuids: ['3b241101-e2bb-4255-8caf-4136c566a962'] } }) }, 400: error },
      },
    },
    '/api/password': {
      get: {
        tags: ['Générateurs'],
        summary: 'Générer un mot de passe sécurisé',
        parameters: [
          { name: 'length', in: 'query', schema: { type: 'integer', minimum: 4, maximum: 128, default: 16 } },
          { name: 'uppercase', in: 'query', schema: { type: 'boolean', default: true } },
          { name: 'numbers', in: 'query', schema: { type: 'boolean', default: true } },
          { name: 'symbols', in: 'query', schema: { type: 'boolean', default: true } },
        ],
        responses: {
          200: { description: 'OK', content: json({ type: 'object', example: { password: 'q7#Lx!9vR2@mT4pZ', length: 16, entropyBits: 103, strength: 'fort' } }) },
          400: error,
        },
      },
    },
    '/api/qrcode': {
      get: {
        tags: ['Générateurs'],
        summary: 'Générer un QR code (image)',
        parameters: [
          { name: 'text', in: 'query', required: true, schema: { type: 'string', example: 'https://github.com/Amenybn' } },
          { name: 'size', in: 'query', schema: { type: 'integer', minimum: 100, maximum: 1000, default: 300 } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['png', 'svg'], default: 'png' } },
          { name: 'color', in: 'query', schema: { type: 'string', example: '#1e293b' } },
        ],
        responses: { 200: { description: 'Image', content: { 'image/png': {}, 'image/svg+xml': {} } }, 400: error },
      },
      post: {
        tags: ['Générateurs'],
        summary: 'Générer un QR code (corps JSON)',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['text'],
            properties: {
              text: { type: 'string', example: 'Bonjour !' },
              size: { type: 'integer', example: 300 },
              format: { type: 'string', enum: ['png', 'svg'] },
              color: { type: 'string', example: '#4f46e5' },
            },
          }),
        },
        responses: { 200: { description: 'Image', content: { 'image/png': {}, 'image/svg+xml': {} } }, 400: error },
      },
    },
    '/api/hash': {
      post: {
        tags: ['Générateurs'],
        summary: 'Calculer l\'empreinte d\'un texte',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['text'],
            properties: {
              text: { type: 'string', example: 'mot de passe' },
              algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256', 'sha512'], default: 'sha256' },
              encoding: { type: 'string', enum: ['hex', 'base64'], default: 'hex' },
            },
          }),
        },
        responses: { 200: { description: 'OK' }, 400: error },
      },
    },
    '/api/text/stats': {
      post: {
        tags: ['Texte'],
        summary: 'Statistiques d\'un texte (mots, phrases, temps de lecture, mots fréquents)',
        requestBody: textBody('Docker simplifie le déploiement. Un service sans état se déploie facilement !'),
        responses: { 200: { description: 'OK' }, 400: error },
      },
    },
    '/api/text/slugify': {
      post: {
        tags: ['Texte'],
        summary: 'Transformer un texte en slug d\'URL',
        requestBody: textBody('Déploiement d\'un Service Élégant !'),
        responses: { 200: { description: 'OK', content: json({ type: 'object', example: { slug: 'deploiement-d-un-service-elegant' } }) }, 400: error },
      },
    },
    '/api/convert': {
      get: {
        tags: ['Conversions'],
        summary: 'Convertir une valeur entre deux unités',
        parameters: [
          { name: 'category', in: 'query', required: true, schema: { type: 'string', enum: ['length', 'weight', 'data', 'temperature'] } },
          { name: 'value', in: 'query', required: true, schema: { type: 'number', example: 100 } },
          { name: 'from', in: 'query', required: true, schema: { type: 'string', example: 'C' } },
          { name: 'to', in: 'query', required: true, schema: { type: 'string', example: 'F' } },
        ],
        responses: { 200: { description: 'OK', content: json({ type: 'object', example: { category: 'temperature', value: 100, from: 'C', to: 'F', result: 212 } }) }, 400: error },
      },
    },
    '/api/convert/units': {
      get: { tags: ['Conversions'], summary: 'Lister les unités disponibles par catégorie', responses: { 200: { description: 'OK' } } },
    },
  },
  components: {
    responses: {
      BadRequest: {
        description: 'Paramètres invalides',
        content: json({ type: 'object', example: { error: 'Bad Request', message: 'length doit être un entier entre 4 et 128' } }),
      },
    },
  },
};
