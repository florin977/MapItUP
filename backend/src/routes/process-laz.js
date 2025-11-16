import { Router } from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = Router();

// --- Obține path-ul directorului curent ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const venvPython = path.join(__dirname, "../venv/bin/python3");

// Folder pentru fișiere uploadate
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

// POST /process-laz
router.post("/", upload.single("lazFile"), (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) return res.status(400).json({ error: "No file uploaded" });

  const scriptPath = path.join(__dirname, "../parse_laz.py");

    exec(`${venvPython} ${scriptPath} ${filePath}`, (err, stdout, stderr) => {
    // Șterge fișierul temporar
    fs.unlink(filePath, () => {});
    
    console.log("stdout:", stdout);
    console.log("stderr:", stderr);

    if (err) {
      console.error("Script error:", stderr);
      return res.status(500).json({ error: "Processing failed" });
    }

    try {
      const result = JSON.parse(stdout);
      res.json(result);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr);
      console.error("Raw output:", stdout);
      res.status(500).json({ error: "Invalid JSON output from script" });
    }
  });
});

export default router;
