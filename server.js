const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const AWS = require("@aws-sdk/client-secrets-manager");
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const multer = require("multer");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 9090;

let S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
let AWS_REGION = process.env.REGION;

const s3Client = new S3Client({
  region: AWS_REGION,
});

// get secret key from secret manager using aws sdk
const client = new AWS.SecretsManager({ region: process.env.AWS_REGION });
let KeyFromSecretManager = null;
async function getSecretKey() {
  const secretKey = await client.send(
    new AWS.GetSecretValueCommand({
      SecretId: process.env.SECRET_NAME,
    })
  );
  KeyFromSecretManager = JSON.parse(secretKey.SecretString).APP_ENV;
  return JSON.parse(secretKey.SecretString).APP_ENV;
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/healthz", (req, res) => {
  res.type("text/plain").send("ok");
});

app.get("/", (req, res) => {
  res.json({
    name: "apprunner-demo",
    env: KeyFromSecretManager || "development",
  });
});

// Serve the S3 file manager HTML page
app.get("/upload", (req, res) => {
  res.sendFile(path.join(__dirname, "FileUpload", "index.html"));
});

// Serve static files from FileUpload directory
app.use("/static", express.static(path.join(__dirname, "FileUpload")));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Get list of uploaded files
app.get("/files", async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
    });

    const response = await s3Client.send(command);
    const files = [];

    if (response.Contents) {
      for (const object of response.Contents) {
        // Extract original name from stored filename (format: originalName-timestamp.extension)
        const nameParts = object.Key.split("-");
        const extension = path.extname(object.Key);
        const originalName =
          nameParts.length > 1
            ? nameParts.slice(0, -1).join("-") + extension
            : object.Key;

        // Generate presigned URL for download/viewing
        const getCommand = new GetObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: object.Key,
        });

        const url = await getSignedUrl(s3Client, getCommand, {
          expiresIn: 3600,
        }); // 1 hour expiry

        files.push({
          filename: object.Key,
          originalName: originalName,
          size: object.Size,
          uploadDate: object.LastModified,
          url: url,
        });
      }
    }

    res.json({ files });
  } catch (error) {
    console.error("Error getting files from S3:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving files from S3",
      error: error.message,
    });
  }
});

// configure multer for file uploads
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: S3_BUCKET_NAME,
    key: function (req, file, cb) {
      // Generate unique filename with timestamp, but include original name
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const originalName = path.parse(file.originalname).name;
      const extension = path.extname(file.originalname);
      const filename = `${originalName}-${uniqueSuffix}${extension}`;
      cb(null, filename);
    },
    metadata: function (req, file, cb) {
      cb(null, {
        originalName: file.originalname,
        fieldName: file.fieldname,
      });
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images, PDFs, and common document types
    const allowedTypes = /jpeg|jpg|png|gif|svg|pdf|txt|doc|docx/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          "Only images (including SVG), PDFs, and documents are allowed!"
        )
      );
    }
  },
});

// File upload endpoint
app.post("/upload", upload.array("files", 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const uploadedFiles = req.files.map((file) => ({
      originalName: file.metadata.originalName, // Original filename
      filename: file.key, // S3 key (stored filename)
      size: file.size,
      mimetype: file.mimetype,
      location: file.location, // S3 URL
      bucket: file.bucket, // S3 bucket name
      url: `/files/${file.key}`, // Our download endpoint
    }));

    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading files",
      error: error.message,
    });
  }
});

// Add this new endpoint after the existing routes (around line 157)

// Download file endpoint with proper headers
app.get("/download/:filename", async (req, res) => {
  try {
    const { filename } = req.params;

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: filename,
    });

    const response = await s3Client.send(command);

    // Set headers to force download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      response.ContentType || "application/octet-stream"
    );

    // Pipe the S3 response to the client
    response.Body.pipe(res);
  } catch (error) {
    console.error("Error downloading file from S3:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading file from S3",
      error: error.message,
    });
  }
});

// get secret key from secret manager using aws sdk
getSecretKey()
  .then((secretKey) => {
    console.log("secret key from secret manager:", secretKey);
  })
  .finally(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log(
        `Server listening on http://0.0.0.0:${port} with env: ${KeyFromSecretManager}`
      );
    });
  });
