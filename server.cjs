require("dotenv").config();
// Validate basic env & initialize config
require("./src/config");

const fetch = require("node-fetch");

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Backend running on ${PORT}`));

// Keep backend awake on Render (every 12 minutes)
setInterval(() => {
  fetch("https://api.knost.in/api/auth/ping")
    .then(() => console.log("Ping success"))
    .catch((err) => console.error("Ping failed:", err));
}, 12 * 60 * 1000);