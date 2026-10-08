const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const get = path => fetch(base + path);
const post = (path, body) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('GET /health renvoie UP', async () => {
  const res = await get('/health');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'UP');
});

test('GET /api/uuid génère le nombre demandé d\'UUID uniques', async () => {
  const { uuids } = await (await get('/api/uuid?count=5')).json();
  assert.equal(uuids.length, 5);
  assert.equal(new Set(uuids).size, 5);
  assert.match(uuids[0], /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('GET /api/uuid refuse un count invalide', async () => {
  const res = await get('/api/uuid?count=500');
  assert.equal(res.status, 400);
});

test('GET /api/password respecte la longueur et les options', async () => {
  const body = await (await get('/api/password?length=24&symbols=false')).json();
  assert.equal(body.password.length, 24);
  assert.match(body.password, /^[A-Za-z0-9]+$/);
  assert.match(body.password, /[0-9]/);
  assert.match(body.password, /[A-Z]/);
});

test('POST /api/hash calcule un sha256 connu', async () => {
  const body = await (await post('/api/hash', { text: 'abc' })).json();
  assert.equal(body.hash, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('POST /api/hash refuse un algorithme inconnu', async () => {
  const res = await post('/api/hash', { text: 'abc', algorithm: 'sha3' });
  assert.equal(res.status, 400);
});

test('POST /api/text/stats compte mots et phrases', async () => {
  const body = await (await post('/api/text/stats', { text: 'Bonjour le monde. Docker est génial !' })).json();
  assert.equal(body.words, 6);
  assert.equal(body.sentences, 2);
});

test('POST /api/text/slugify retire accents et ponctuation', async () => {
  const body = await (await post('/api/text/slugify', { text: "  Déploiement d'un Service Élégant ! " })).json();
  assert.equal(body.slug, 'deploiement-d-un-service-elegant');
});

test('GET /api/convert convertit température et longueur', async () => {
  const t = await (await get('/api/convert?category=temperature&value=100&from=C&to=F')).json();
  assert.equal(t.result, 212);
  const l = await (await get('/api/convert?category=length&value=1&from=km&to=m')).json();
  assert.equal(l.result, 1000);
});

test('GET /api/convert refuse une unité inconnue', async () => {
  const res = await get('/api/convert?category=length&value=1&from=km&to=parsec');
  assert.equal(res.status, 400);
});

test('GET /api/qrcode renvoie une image PNG et SVG', async () => {
  const png = await get('/api/qrcode?text=hello');
  assert.equal(png.headers.get('content-type'), 'image/png');
  const bytes = new Uint8Array(await png.arrayBuffer());
  assert.deepEqual([...bytes.slice(1, 4)], [0x50, 0x4e, 0x47]);
  const svg = await get('/api/qrcode?text=hello&format=svg');
  assert.match(await svg.text(), /<svg/);
});

test('JSON invalide → 400 et route inconnue → 404', async () => {
  const bad = await fetch(base + '/api/hash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(bad.status, 400);
  const missing = await get('/api/inexistant');
  assert.equal(missing.status, 404);
});
