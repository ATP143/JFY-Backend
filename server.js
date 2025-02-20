import express from "express";
import { google } from "googleapis";
import { IncomingForm } from "formidable";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log("🚀 Starting JFY Backend...");

// Load Google Service Account credentials from environment variables
const serviceAccount = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Ensure correct formatting
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
};

// Authenticate Google Drive API
const auth = new google.auth.JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

// Root Route
app.get("/", (req, res) => {
  res.send("🚀 JFY Backend is Running!");
});

// File Upload Route
app.post("/upload", (req, res) => {
  const form = new IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "File upload error" });

    if (!files.file || !files.file[0]) return res.status(400).json({ error: "No file uploaded" });

    const filePath = files.file[0].filepath;
    const fileName = files.file[0].originalFilename;
    const mimeType = files.file[0].mimetype;

    try {
      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        },
        media: {
          mimeType,
          body: fs.createReadStream(filePath),
        },
        fields: "id",
      });

      return res.status(200).json({ fileId: response.data.id });
    } catch (error) {
      return res.status(500).json({ error: "Failed to upload to Google Drive" });
    }
  });
});

// Start Server
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
