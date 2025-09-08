const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const AWS = require("@aws-sdk/client-secrets-manager");
const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 9090;

const client = new AWS.SecretsManager({ region: process.env.AWS_REGION });

async function getSecretKey() {
  const secretKey = await client.send(
    new AWS.GetSecretValueCommand({
      SecretId: process.env.SECRET_NAME,
    })
  );
  console.log(
    "secret key from secret manager:",
    JSON.parse(secretKey.SecretString).APP_ENV
  );
  return JSON.parse(secretKey.SecretString).APP_ENV;
}

app.get("/auto-deploy", (req, res) => {
  res.json({
    message: "Auto deploy endpoint successful",
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

getSecretKey()
  .then((secretKey) => {
    console.log("secret key from secret manager:", secretKey);
  })
  .catch((err) => {
    console.error("Error getting secret key:", err);
  })
  .finally(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server listening on http://0.0.0.0:${port}`);
    });
  });
