import express from "express";
import { google } from "googleapis";
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log server start
console.log("🚀 Starting JFY Backend...");

// Ensure GOOGLE_APPLICATION_CREDENTIALS exists
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("❌ GOOGLE_APPLICATION_CREDENTIALS not found in environment variables!");
  process.exit(1); // Exit if missing
}

// Parse JSON from environment variable
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  console.log("✅ Successfully loaded service account credentials from env.");
} catch (error) {
  console.error("❌ Error parsing GOOGLE_APPLICATION_CREDENTIALS:", error);
  process.exit(1);
}

// Write JSON to a temporary file
const credentialsPath = path.resolve("service-account.json");
fs.writeFileSync(credentialsPath, JSON.stringify(serviceAccount));
console.log("📄 Service account JSON written to:", credentialsPath);

// Authenticate Google Drive API
const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

// Root Route
app.get("/", (req, res) => {
  console.log("📡 Received GET request at /");
  res.send("🚀 JFY Backend is Running!");
});

// File Upload Route
app.post("/upload", (req, res) => {
  console.log("📡 Received POST request at /upload");

  const form = new IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ File upload error:", err);
      return res.status(500).json({ error: "File upload error" });
    }

    try {
      if (!files.file || !files.file[0]) {
        console.warn("⚠️ No file uploaded!");
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = files.file[0].filepath;
      const fileName = files.file[0].originalFilename;
      const mimeType = files.file[0].mimetype;

      console.log(`📂 Uploading file: ${fileName} (${mimeType})`);

      // Upload file metadata
      const fileMetadata = {
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // Ensure env variable exists
      };

      const media = {
        mimeType,
        body: fs.createReadStream(filePath),
      };

      console.log("🚀 Uploading to Google Drive...");
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: "id",
      });

      console.log("✅ Upload successful! File ID:", response.data.id);
      return res.status(200).json({ fileId: response.data.id });
    } catch (error) {
      console.error("❌ Google Drive API Error:", error);
      return res.status(500).json({ error: "Failed to upload to Google Drive" });
    }
  });
});

// Start Server
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
