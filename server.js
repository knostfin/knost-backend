const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get("/health", async (req, res) => {
  try {
    const db_res = await pool.query("SELECT NOW()");
    res.json({
      status: "ok",
      database: "connected",
      serverTime: new Date().toISOString(),
      dbTime: db_res.rows[0].now
    });
  } catch (err) {
    res.json({ status: "error", error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));