const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Trust proxy (required for rate limiting behind proxies like Render)
app.set("trust proxy", 1);

// CORS - MUST be before rate limiting to handle OPTIONS preflight
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "https://knost.in" || "https://www.knost.in" || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Security headers (disabled in development to avoid CORS issues)
if (process.env.NODE_ENV === "production") {
  app.use(helmet());
}

// Basic rate limiting (relaxed for development, skip OPTIONS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // Higher limit for dev
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS", // Skip preflight requests
});
app.use(limiter);

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Error handler (should be last middleware)
app.use(errorHandler);

module.exports = app;
