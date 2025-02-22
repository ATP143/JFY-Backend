require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
const streamifier = require("streamifier");

const app = express();
const PORT = 5000;

// Load service account JSON from .env path
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) {
  console.error("❌ SERVICE_ACCOUNT_PATH is missing in .env");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// Initialize Google Drive Auth
const auth = new google.auth.JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });
const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

if (!FOLDER_ID) {
  console.error("❌ DRIVE_FOLDER_ID is missing in .env");
  process.exit(1);
}

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload file route
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📂 Uploading:", req.file.originalname);

    const fileMetadata = {
      name: req.file.originalname,
      parents: [FOLDER_ID],
    };

    const media = {
      mimeType: req.file.mimetype,
      body: streamifier.createReadStream(req.file.buffer), // ✅ Convert buffer to stream
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });

    console.log("✅ File Uploaded:", response.data.id);
    res.json({ success: true, fileId: response.data.id });

  } catch (error) {
    console.error("❌ Upload Error:", error.message);
    res.status(500).json({ error: "Failed to upload file", details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
