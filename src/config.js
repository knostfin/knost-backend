require("dotenv").config();

const required = [
  "DATABASE_USERNAME",
  "DATABASE_PASSWORD",
  "DATABASE_HOST",
  "DATABASE",
  "DATABASE_PORT",
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(
    `Warning: missing required environment variables: ${missing.join(", ")}`
  );
}

module.exports = {
  get: (key, fallback) => process.env[key] ?? fallback,
};
