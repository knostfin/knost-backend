const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const authRoutes = require("./routes/auth");
const errorHandler = require("./middlewares/errorHandler");
const securityResponseChecker = require("./middlewares/securityMiddleware");
const { startCleanupJob } = require("./services/tokenCleanupService");

const app = express();

// Start token cleanup job
startCleanupJob();

// Trust proxy (required for rate limiting behind proxies like Render)
app.set("trust proxy", 1);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// CORS - MUST be before rate limiting to handle OPTIONS preflight
// Dynamically build allowed origins based on environment
const getAllowedOrigins = () => {
  const origins = [
    "https://knost.in",
    "https://www.knost.in",
  ];

  // Add development origins
  if (process.env.NODE_ENV !== "production") {
    origins.push(
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173"
    );
  }

  // Add dev domain if configured
  if (process.env.DOMAIN) {
    origins.push(`https://${process.env.DOMAIN}`);
    origins.push(`https://www.${process.env.DOMAIN}`);
  }

  return origins;
};

app.use(
  cors({
    origin: getAllowedOrigins(),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"],
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

// Security response checker (development only)
app.use(securityResponseChecker);

// Routes
app.use("/api/auth", authRoutes);

// Error handler (should be last middleware)
app.use(errorHandler);

module.exports = app;
