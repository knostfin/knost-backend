const { Pool } = require("pg");
require("dotenv").config();

// Build pool config with sane defaults for hosted PG (Supabase/Render/Neon)
const pool = new Pool({
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE,
  port: Number(process.env.DATABASE_PORT),

  // SSL is required for most hosted providers
  ssl: { rejectUnauthorized: false },

  // Connection pool tuning
  max: 10,                      // keep modest; external poolers handle heavy lifting
  idleTimeoutMillis: 30_000,    // close idle clients after 30s
  connectionTimeoutMillis: 10_000,

  // Keep TCP connections alive to avoid idle disconnects
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,

  // Ensure Node process won't exit due to idle pool
  allowExitOnIdle: false,

  // Reasonable safety timeouts at client side
  statement_timeout: 15_000,
  query_timeout: 20_000,
});

// Safely set search_path when a new client is established (no-op if unset)
pool.on("connect", (client) => {
  const schema = process.env.DATABASE_SCHEMA && String(process.env.DATABASE_SCHEMA).trim();
  if (schema) {
    // SET commands can't use bind params for identifiers; ensure env is controlled
    client.query(`SET search_path TO ${schema}, public`).catch(() => {});
  }
});

// Do NOT crash the process on transient pool errors; log and let pg reconnect
pool.on("error", (err) => {
  console.error("❌ Unexpected PG error", err);
});

module.exports = pool;