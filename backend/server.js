import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import multer from "multer";

dotenv.config();
const { Client } = pkg;

const app = express();
app.use(cors());
app.use(express.json());


// ======================================================
// PostgreSQL CONNECTION
// ======================================================
const db = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

db.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch(err => console.error("DB ERROR:", err));


// ======================================================
// MULTER (stocare în memorie pentru .laz)
// ======================================================
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".laz")) {
      return cb(new Error("Only .laz files are allowed"));
    }
    cb(null, true);
  },
});


// ======================================================
// SIGNUP ADMIN (cu TOKEN)
// ======================================================
app.post("/signup", async (req, res) => {
  const { mail, parola, token } = req.body;

  if (!mail || !parola || !token) {
    return res.status(400).json({ msg: "All fields are required." });
  }

  if (token !== process.env.VITE_ADMIN_SIGNUP_TOKEN) {
    return res.status(403).json({ msg: "Invalid signup token." });
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

    res.json({ msg: "Admin account created successfully." });

  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ msg: "Database error." });
  }
});


// ======================================================
// LOGIN ADMIN
// ======================================================
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
      return res.status(400).json({ msg: "Invalid credentials. Please try again." });
    }

    res.json({
      msg: "Login successful",
      token: "ADMIN_OK"
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ msg: "Database error." });
  }
});


// ======================================================
// UPLOAD FLOOR (.laz → BYTEA)
// ======================================================
app.post("/upload-floor", upload.single("lazFile"), async (req, res) => {
  try {
    const { floorName, floorNumber, offsetX, offsetY, zoom } = req.body;

    if (!req.file) {
      return res.status(400).json({ msg: "No .laz file uploaded." });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;

    await db.query(
      `INSERT INTO floors (floor_name, floor_number, laz_buffer, laz_name, offset_x, offset_y, zoom)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        floorName,
        floorNumber,
        fileBuffer,
        fileName,
        offsetX,
        offsetY,
        zoom
      ]
    );

    res.json({ msg: "Floor uploaded successfully & stored in DB." });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ msg: "Upload error." });
  }
});


// ======================================================
// DOWNLOAD FLOOR FILE
// ======================================================
app.get("/floor/:id/download", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await db.query(
      "SELECT laz_buffer, laz_name FROM floors WHERE id=$1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Floor not found." });
    }

    const file = result.rows[0];

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${file.laz_name}`
    );
    res.setHeader("Content-Type", "application/octet-stream");

    res.send(file.laz_buffer);

  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);
    res.status(500).json({ msg: "Error downloading file." });
  }
});


// ======================================================
// START SERVER
// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});
