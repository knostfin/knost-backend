require("dotenv").config();

// Validate env & initialize app config (DB, globals, etc.)
require("./src/config");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

/* ------------------------------------------------------------------
   Swagger (DISABLED IN PRODUCTION FOR SPEED & SECURITY)
------------------------------------------------------------------- */
if (process.env.NODE_ENV !== "production") {
  // Serve raw JSON first to avoid being captured by the UI middleware
  app.get("/api-docs/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Swagger UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerUrl: "/api-docs/swagger.json",
    })
  );
}

/* ------------------------------------------------------------------
   START SERVER
------------------------------------------------------------------- */
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});