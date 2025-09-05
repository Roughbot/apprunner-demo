const express = require("express");
require("dotenv").config();
const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.get("/healthz", (req, res) => {
  res.type("text/plain").send("ok");
});

app.get("/", (req, res) => {
  res.json({
    name: "apprunner-demo",
    env: process.env.APP_ENV || "development",
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
