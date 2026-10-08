const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
const server = createApp().listen(port, () => {
  console.log(`Toolbox Service démarré sur http://localhost:${port} (documentation : /docs)`);
});

// Arrêt propre (docker stop envoie SIGTERM)
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} reçu, arrêt du service...`);
    server.close(() => process.exit(0));
  });
}
