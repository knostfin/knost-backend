const { Pool } = require("pg");
require("dotenv").config();

const host = process.env.DATABASE_HOST || "";

const useSSL =
  process.env.DATABASE_SSL === "true" ||
  host.includes("neon.tech") ||
  host.includes("supabase") ||
  host.includes("render.com");

const pool = new Pool({
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE,
  port: Number(process.env.DATABASE_PORT || 5432),

  ssl: useSSL ? { rejectUnauthorized: false } : false,

  // 🔑 Neon + Render tuning
  max: 3,                         // VERY IMPORTANT
  idleTimeoutMillis: 60_000,      // close idle after 60s (Neon suspends after 5min)
  connectionTimeoutMillis: 10_000,// 10s timeout for Neon cold starts
  allowExitOnIdle: true,          // prevents hanging workers
  
  // Neon-specific: Keep connection alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000
});

module.exports = pool;