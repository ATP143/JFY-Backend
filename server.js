const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Google Drive authentication
const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json", // Update if your file has a different name
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

// Multer setup for handling file uploads
const upload = multer({ dest: "uploads/" });

/**
 * 📤 Upload a file to Google Drive
 */
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID; // Set this in .env file
    if (!folderId) {
      return res.status(500).json({ error: "Missing GOOGLE_DRIVE_FOLDER_ID in .env" });
    }

    const fileMetadata = {
      name: req.file.originalname,
      parents: [folderId], // Uploads file into the specific Google Drive folder
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, name",
    });

    // Delete the temporary file after upload
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      message: "File uploaded successfully",
      fileId: response.data.id,
      fileName: response.data.name,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload file", details: error.message });
  }
});

/**
 * 📋 Get list of files in Google Drive
 */
app.get("/files", async (req, res) => {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, webViewLink, webContentLink)",
    });

    res.status(200).json(response.data.files);
  } catch (error) {
    console.error("Error fetching file list:", error);
    res.status(500).json({ error: "Failed to retrieve files" });
  }
});

/**
 * 🗑️ Delete a file from Google Drive
 */
app.delete("/delete/:fileId", async (req, res) => {
  try {
    await drive.files.delete({ fileId: req.params.fileId });
    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

/**
 * 🚀 Start the server
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
