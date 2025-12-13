const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Knost API",
      version: "1.0.0",
      description: "Backend APIs for Knost application",
    },
    servers: [
      { url: "https://api.knost.in" },
      { url: "https://api-dev.knost.in" },
      { url: "http://localhost:5000" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"], // 👈 THIS will scan auth.js & finance.js
};

module.exports = swaggerJsdoc(options);