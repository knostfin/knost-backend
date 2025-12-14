const express = require("express");
const cors = require("cors");
const pool = require("./db");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/auth");
const financeRoutes = require("./routes/finance");
const errorHandler = require("./middlewares/errorHandler");
const securityResponseChecker = require("./middlewares/securityMiddleware");
const { startCleanupJob } = require("./services/tokenCleanupService");

const app = express();

/* ------------------------------------------------------------------
   1️⃣ HEALTH CHECK (MUST BE FIRST & FAST)
------------------------------------------------------------------- */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "knost-backend",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

/* ------------------------------------------------------------------
   2️⃣ TRUST PROXY (RENDER / CLOUDFLARE)
------------------------------------------------------------------- */
app.set("trust proxy", 1);

/* ------------------------------------------------------------------
   3️⃣ START BACKGROUND JOB (DELAYED TO REDUCE COLD START)
------------------------------------------------------------------- */
setTimeout(startCleanupJob, 30_000);

/* ------------------------------------------------------------------
   4️⃣ STATIC FILES
------------------------------------------------------------------- */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/* ------------------------------------------------------------------
   5️⃣ CORS (FAST + SAFE)
------------------------------------------------------------------- */
const ALLOWED_ORIGINS = [
  "https://knost.in",
  "https://www.knost.in",
  "https://dev.knost.in",

  // Local development
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server, curl, health checks
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "cache-control", "pragma"],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24 hours
  })
);

/* ------------------------------------------------------------------
   6️⃣ SECURITY HEADERS
------------------------------------------------------------------- */
if (process.env.NODE_ENV === "production") {
  app.use(helmet());
}

/* ------------------------------------------------------------------
   7️⃣ RATE LIMITING (SKIP OPTIONS & HEALTH)
------------------------------------------------------------------- */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.method === "OPTIONS" || req.path === "/health",
});
app.use(limiter);

/* ------------------------------------------------------------------
   8️⃣ LOGGING
------------------------------------------------------------------- */
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/* ------------------------------------------------------------------
   9️⃣ BODY PARSER
------------------------------------------------------------------- */
app.use(express.json());

/* ------------------------------------------------------------------
   🔟 SECURITY RESPONSE CHECKER (DEV ONLY, SKIPS /health)
------------------------------------------------------------------- */
app.use(securityResponseChecker);

/* ------------------------------------------------------------------
   1️⃣1️⃣ ROUTES
------------------------------------------------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/finance", financeRoutes);

// -----------------------------
// Neon DB warm-up (run every 1 hour)
// -----------------------------
setInterval(() => {
   pool.query("SELECT 1").catch(() => {});
}, 60 * 60 * 1000); // 1 hour


/* ------------------------------------------------------------------
   1️⃣2️⃣ ERROR HANDLER (LAST)
------------------------------------------------------------------- */
app.use(errorHandler);

module.exports = app;