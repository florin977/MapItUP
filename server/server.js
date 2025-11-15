import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
app.use(cors());
app.use(express.json());

// CONNECT POSTGRES
const db = new pg.Client({
  user: "alinBRUMARI",   // USERUL TĂU
  password: "1234",      // PAROLA TA
  host: "localhost",
  database: "mapitup",   // NUMELE DB-ULUI TĂU
  port: 5432
});

db.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch(err => console.error("DB ERROR:", err));


// ==========================
// ----- SIGNUP ADMIN -------
// ==========================
app.post("/signup", async (req, res) => {
  const { mail, parola } = req.body;

  if (!mail || !parola) {
    return res.status(400).json({ msg: "Email and password are required." });
  }

  try {
    // verifica daca exista
    const check = await db.query(
      "SELECT * FROM USER_ADMIN WHERE mail = $1",
      [mail]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ msg: "Email already exists." });
    }

    // creaza user-ul
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


// ==========================
// ------- LOGIN ADMIN ------
// ==========================
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

    // succes
    res.json({
      msg: "Login successful.",
      token: "ADMIN_OK"  // poți pune orice aici
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Database error." });
  }
});


// RUN SERVER
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
