import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();

app.use(express.json());
app.use(cors());

// DB connection
const pool = new Pool({
  user: "postgres",
  password: "postgres",
  host: "localhost",
  port: 5432,
  database: "knostdb"
});

// Health API
app.get("/health", async (req, res) => {
  try {
    const dbResult = await pool.query("SELECT NOW()");
    res.json({
      status: "ok",
      database: "connected",
      serverTime: new Date(),
      dbTime: dbResult.rows[0].now
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

app.listen(5000, () => console.log("API running on http://localhost:5000"));