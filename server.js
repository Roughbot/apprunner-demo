const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.get("/auto-deploy", (req, res) => {
  res.json({
    message: "Auto deploy endpoint",
  });
});

app.get("/sathya", (req, res) => {
  const imagePath = path.join(__dirname, "public", "sathya.jpg");
  fs.access(imagePath, fs.constants.R_OK, (err) => {
    if (err) {
      return res.status(404).type("text/plain").send("Image not found");
    }
    res.sendFile(imagePath, (sendErr) => {
      if (sendErr) {
        res.status(500).type("text/plain").send("Failed to send image");
      }
    });
  });
});

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
