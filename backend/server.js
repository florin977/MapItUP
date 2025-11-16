import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcrypt"; // <<< adaugă bcrypt
import processLazRouter from "./src/routes/process-laz.js";

dotenv.config();
const { Client } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

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
  .catch(err => console.error("DB ERROR:", err));

// =========================
// SIGNUP
// =========================
app.post("/signup", async (req, res) => {
  console.log("Signup request body:", req.body);
  const { mail, parola, token } = req.body;

  if (token !== process.env.VITE_ADMIN_SIGNUP_TOKEN) {
    return res.status(403).json({ msg: "Invalid signup token." });
  }
  if (!mail || !parola) {
    return res.status(400).json({ msg: "Email and password required." });
  }

  try {
    const check = await db.query(
      "SELECT * FROM USER_ADMIN WHERE mail = $1",
      [mail.trim()]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ msg: "Email already exists." });
    }

    // hash parola
    const hashedPassword = await bcrypt.hash(parola.trim(), 10);

    await db.query(
      "INSERT INTO USER_ADMIN (mail, parola) VALUES ($1, $2)",
      [mail.trim(), hashedPassword]
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
      "SELECT * FROM USER_ADMIN WHERE mail = $1",
      [mail.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ msg: "Invalid credentials." });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(parola.trim(), user.parola);

    if (!match) {
      return res.status(400).json({ msg: "Invalid credentials." });
    }

    res.json({ msg: "Login successful.", token: "ADMIN_OK" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Database error." });
  }
});

// =========================
// PROCESS LAZ
// =========================
app.use("/process-laz", processLazRouter);

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
