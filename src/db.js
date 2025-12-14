const { Pool } = require("pg");
require("dotenv").config();

// Determine SSL setting: enable if DATABASE_SSL=true or if host suggests cloud provider
const host = process.env.DATABASE_HOST || "";
const useSSL =
  process.env.DATABASE_SSL === "true" ||
  host.includes("render.com") ||
  host.includes("railway.app") ||
  host.includes("postgres.render.com") ||
  host.includes(".cloud.") ||
  host.includes("neon.tech") ||
  host.includes("supabase");

const pool = new Pool({
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE,
  port: process.env.DATABASE_PORT,
  // Use SSL for cloud databases; disable for localhost
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

module.exports = pool;