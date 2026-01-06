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

// Helper: Format dates from pg to ISO strings without timezone conversion
pool.formatDate = (date) => {
  if (!date) return null;
  if (typeof date === 'string') return date;
  if (date instanceof Date) {
    // Build YYYY-MM-DD using local date parts to avoid TZ shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return date;
};

// Helper: Clean row dates before returning to client
pool.formatRows = (rows) => {
  if (!Array.isArray(rows)) return rows;
  return rows.map(row => {
    const formatted = {};
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) {
        formatted[key] = pool.formatDate(value);
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  });
};

module.exports = pool;

// Transaction helper: run a function within BEGIN/COMMIT with automatic ROLLBACK on error
module.exports.withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* Ignore rollback errors */ }
    throw err;
  } finally {
    client.release();
  }
};

// Advisory lock helper: scopes lock to (key1,key2) for the duration of the transaction
module.exports.acquireAdvisoryLock = async (client, key1, key2) => {
  if (client && Number.isFinite(key1) && Number.isFinite(key2)) {
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [key1, key2]);
  }
};