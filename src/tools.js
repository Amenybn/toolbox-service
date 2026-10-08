const crypto = require('node:crypto');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = message => new HttpError(400, message);

// ---------------------------------------------------------------------------
// Mots de passe
// ---------------------------------------------------------------------------
const CHARSETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
};

function generatePassword({ length = 16, uppercase = true, numbers = true, symbols = true } = {}) {
  if (!Number.isInteger(length) || length < 4 || length > 128) {
    throw badRequest('length doit être un entier entre 4 et 128');
  }
  const sets = [CHARSETS.lowercase];
  if (uppercase) sets.push(CHARSETS.uppercase);
  if (numbers) sets.push(CHARSETS.numbers);
  if (symbols) sets.push(CHARSETS.symbols);
  const pool = sets.join('');

  // Au moins un caractère de chaque famille demandée, puis complément aléatoire
  const chars = sets.map(set => set[crypto.randomInt(set.length)]);
  while (chars.length < length) chars.push(pool[crypto.randomInt(pool.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  const entropy = Math.round(length * Math.log2(pool.length));
  const strength = entropy < 50 ? 'faible' : entropy < 80 ? 'moyen' : entropy < 110 ? 'fort' : 'très fort';
  return { password: chars.join(''), length, entropyBits: entropy, strength };
}

// ---------------------------------------------------------------------------
// UUID & hash
// ---------------------------------------------------------------------------
function generateUuids(count = 1) {
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw badRequest('count doit être un entier entre 1 et 100');
  }
  return Array.from({ length: count }, () => crypto.randomUUID());
}

const HASH_ALGORITHMS = ['md5', 'sha1', 'sha256', 'sha512'];

function hash(text, algorithm = 'sha256', encoding = 'hex') {
  if (typeof text !== 'string') throw badRequest('text est obligatoire (chaîne)');
  if (!HASH_ALGORITHMS.includes(algorithm)) {
    throw badRequest(`algorithm doit être l'un de : ${HASH_ALGORITHMS.join(', ')}`);
  }
  if (!['hex', 'base64'].includes(encoding)) throw badRequest('encoding doit être hex ou base64');
  return crypto.createHash(algorithm).update(text, 'utf8').digest(encoding);
}

// ---------------------------------------------------------------------------
// Texte
// ---------------------------------------------------------------------------
function textStats(text) {
  if (typeof text !== 'string') throw badRequest('text est obligatoire (chaîne)');
  const words = text.match(/[\p{L}\p{N}'’-]+/gu) ?? [];
  const sentences = text.split(/[.!?…]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const frequency = {};
  for (const w of words) {
    const key = w.toLowerCase();
    if (key.length > 3) frequency[key] = (frequency[key] ?? 0) + 1;
  }
  const topWords = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));
  return {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    readingTimeSeconds: Math.ceil((words.length / 200) * 60),
    topWords,
  };
}

function slugify(text) {
  if (typeof text !== 'string') throw badRequest('text est obligatoire (chaîne)');
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Conversions d'unités
// ---------------------------------------------------------------------------
const UNITS = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
  weight: { kg: 1, g: 0.001, mg: 0.000001, t: 1000, lb: 0.45359237, oz: 0.028349523125 },
  data: { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 },
  temperature: { C: null, F: null, K: null },
};

function toCelsius(value, unit) {
  if (unit === 'C') return value;
  if (unit === 'F') return ((value - 32) * 5) / 9;
  return value - 273.15;
}

function fromCelsius(value, unit) {
  if (unit === 'C') return value;
  if (unit === 'F') return (value * 9) / 5 + 32;
  return value + 273.15;
}

function convert(category, value, from, to) {
  const units = UNITS[category];
  if (!units) throw badRequest(`category doit être l'une de : ${Object.keys(UNITS).join(', ')}`);
  if (!Number.isFinite(value)) throw badRequest('value doit être un nombre');
  for (const u of [from, to]) {
    if (!(u in units)) throw badRequest(`Unité « ${u} » inconnue pour ${category} (${Object.keys(units).join(', ')})`);
  }
  const raw = category === 'temperature' ? fromCelsius(toCelsius(value, from), to) : (value * units[from]) / units[to];
  if (category === 'temperature' && toCelsius(value, from) < -273.15) {
    throw badRequest('Température inférieure au zéro absolu');
  }
  return { category, value, from, to, result: Number(raw.toPrecision(12)) };
}

module.exports = {
  HttpError,
  badRequest,
  generatePassword,
  generateUuids,
  hash,
  HASH_ALGORITHMS,
  textStats,
  slugify,
  convert,
  UNITS,
};
