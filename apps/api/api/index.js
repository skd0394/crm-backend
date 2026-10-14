// Vercel serverless entry: every request is rewritten here (see vercel.json).
const app = require('../src/app');
const migrate = require('../src/db/migrate');

// Run the idempotent schema once per cold start; retry on the next request if it fails.
let ready;

module.exports = async (req, res) => {
  ready ??= migrate().catch((err) => {
    ready = undefined;
    throw err;
  });
  try {
    await ready;
  } catch (err) {
    console.error('Migration failed:', err);
    return res.status(503).json({ error: 'Database unavailable' });
  }
  return app(req, res);
};
