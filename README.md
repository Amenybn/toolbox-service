# Toolbox Service

Micro-service REST **sans base de données** et sans état (Node.js 20 + Express).
Chaque réponse est calculée à la volée : le service peut être déployé, redémarré ou répliqué librement, sans volume.

## Démarrage

```bash
# Docker
docker build -t toolbox-service .
docker run -d -p 3000:3000 toolbox-service

# Local
npm install
npm start      # http://localhost:3000
npm test       # 12 tests d'API
```

- Page de démonstration : `http://<hote>:3000/`
- Documentation Swagger : `http://<hote>:3000/docs`
- Healthcheck : `http://<hote>:3000/health`

## Endpoints

| Méthode | Route | Description |
|---|---|---|
| GET | `/health` | Healthcheck (`{"status":"UP"}`) |
| GET | `/api/info` | Version, hôte, uptime, compteur de requêtes |
| GET | `/api/uuid?count=5` | UUID v4 |
| GET | `/api/password?length=20&symbols=true` | Mot de passe sécurisé + force |
| GET / POST | `/api/qrcode?text=...&format=png\|svg` | QR code (image) |
| POST | `/api/hash` | Empreinte md5 / sha1 / sha256 / sha512 |
| POST | `/api/text/stats` | Mots, phrases, temps de lecture, mots fréquents |
| POST | `/api/text/slugify` | Slug d'URL |
| GET | `/api/convert?category=temperature&value=100&from=C&to=F` | Conversion d'unités (longueur, poids, données, température) |
| GET | `/api/convert/units` | Unités disponibles |

## Configuration

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `3000` | Port HTTP |
