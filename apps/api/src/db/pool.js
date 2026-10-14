const { Pool } = require('pg');
const config = require('../config');

// Serverless instances each hold their own pool, so keep it small there.
const pool = new Pool({ connectionString: config.databaseUrl, max: process.env.VERCEL ? 3 : 10 });

module.exports = pool;
