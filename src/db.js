const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE,
  port: Number(process.env.DATABASE_PORT),

  ssl: { rejectUnauthorized: false },

  // Supabase + Render safe defaults
  max: 10,                     // pooler handles real pooling
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on("connect", (client) => {
  client.query(`SET search_path TO ${process.env.DATABASE_SCHEMA}, public`);
});

pool.on("error", (err) => {
  console.error("❌ Unexpected PG error", err);
  process.exit(1);
});

module.exports = pool;