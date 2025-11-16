// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

import multer from "multer";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

dotenv.config();
const { Client } = pkg;

// ===== ESM __dirname fix =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Multer & execFile promisified =====
const upload = multer({ dest: "uploads/" });
const execFileAsync = promisify(execFile);

// ===== PYTHON PATH (din venv) =====
const pythonPath = path.join(__dirname, "venv", "bin", "python3");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// =========================
// PostgreSQL
// =========================
const db = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

db.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("DB ERROR:", err));

// =========================
// SIGNUP — CU TOKEN
// =========================
app.post("/signup", async (req, res) => {
  const { mail, parola, token } = req.body;

  if (token !== process.env.VITE_ADMIN_SIGNUP_TOKEN) {
    return res.status(403).json({ msg: "Invalid signup token." });
  }

  if (!mail || !parola) {
    return res.status(400).json({ msg: "Email and password are required." });
  }

  try {
    const check = await db.query(
      "SELECT * FROM USER_ADMIN WHERE mail = $1",
      [mail]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ msg: "Email already exists." });
    }

    await db.query(
      "INSERT INTO USER_ADMIN (mail, parola) VALUES ($1, $2)",
      [mail, parola]
    );

    res.json({ msg: "Account created successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Database error." });
  }
});

// =========================
// LOGIN
// =========================
app.post("/login", async (req, res) => {
  const { mail, parola } = req.body;

  if (!mail || !parola) {
    return res.status(400).json({ msg: "Email and password required." });
  }

  try {
    const result = await db.query(
      "SELECT * FROM USER_ADMIN WHERE mail = $1 AND parola = $2",
      [mail, parola]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ msg: "Invalid credentials." });
    }

    res.json({ msg: "Login successful.", token: "ADMIN_OK" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Database error." });
  }
});

// =========================
// LAZ -> SVG via Python
// =========================

app.post("/process-laz", upload.single("lazFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: "No .laz file uploaded." });
  }

  try {
    const lazPath = req.file.path;
    const scriptPath = path.join(__dirname, "laz_processing", "process_laz.py");
    const outputSvgPath = lazPath + ".svg";

    // rulează scriptul Python (din venv)
    await execFileAsync(pythonPath, [scriptPath, lazPath, outputSvgPath]);

    const svgText = await fs.readFile(outputSvgPath, "utf-8");

    res.json({ svg: svgText });
  } catch (err) {
    console.error("LAZ processing error:", err);
    res.status(500).json({ msg: "Error processing LAZ file." });
  }
});

// =========================
// FLOORS GET
// =========================
app.get("/floors/:floorNumber", async (req, res) => {
  const floorNumber = Number(req.params.floorNumber);

  if (Number.isNaN(floorNumber)) {
    return res.status(400).json({ msg: "Invalid floor number" });
  }

  try {
    const result = await db.query(
      "SELECT * FROM floors WHERE floor_number = $1",
      [floorNumber]
    );

    if (result.rows.length === 0) {
      const defaultSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"></svg>
`.trim();

      return res.json({
        floor_number: floorNumber,
        name: `Floor ${floorNumber}`,
        svg: defaultSvg,
        isDefault: true,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Database error." });
  }
});

// =========================
// FLOORS SAVE SVG
// =========================
app.post("/floors/:floorNumber/svg", async (req, res) => {
  const floorNumber = Number(req.params.floorNumber);
  const { name, svg } = req.body;

  if (Number.isNaN(floorNumber) || !name || !svg) {
    return res.status(400).json({ msg: "Missing data." });
  }

  try {
    const result = await db.query(
      `
      INSERT INTO floors (floor_number, name, svg)
      VALUES ($1, $2, $3)
      ON CONFLICT (floor_number)
      DO UPDATE SET name = EXCLUDED.name, svg = EXCLUDED.svg
      RETURNING *;
      `,
      [floorNumber, name, svg]
    );

    res.json({ msg: "Floor saved.", floor: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Database error." });
  }
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
