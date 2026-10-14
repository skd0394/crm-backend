const app = require('./app');
const config = require('./config');
const migrate = require('./db/migrate');

migrate()
  .then(() => {
    app.listen(config.port, () => console.log(`CRM API listening on http://localhost:${config.port}`));
  })
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
