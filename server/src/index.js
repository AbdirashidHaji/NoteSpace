const { createApp } = require('./app');
const env = require('./config/env');

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`NoteSpace API listening on http://localhost:${env.port}`);
});

// Graceful shutdown
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
