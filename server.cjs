require("dotenv").config();
// Validate basic env & initialize config
require("./src/config");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

// Serve raw JSON first to avoid being captured by the UI middleware
app.get("/api-docs/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Then serve the Swagger UI, pointing it to the JSON endpoint explicitly
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, { swaggerUrl: "/api-docs/swagger.json" })
);

app.listen(PORT, () => console.log(`Backend running on ${PORT}`));