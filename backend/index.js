const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_SIGNUP_TOKEN = "UPT_CAMPUS_EXPLORER_ADMIN_TOKEN";

// SIGNUP ADMIN
app.post("/signup", async (req, res) => {
  const { signupToken, email, password } = req.body;

  // verific tokenul
  if (signupToken !== ADMIN_SIGNUP_TOKEN) {
    return res.status(401).json({
      success: false,
      message: "Invalid admin signup token"
    });
  }

  try {
    // verific dacă emailul există deja
    const exists = await pool.query(
      "SELECT * FROM useradmin WHERE email = $1",
      [email]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    // hash parola
    const hashedPassword = await bcrypt.hash(password, 10);

    // inserez în DB
    const result = await pool.query(
      "INSERT INTO useradmin (email, parola) VALUES ($1, $2) RETURNING id",
      [email, hashedPassword]
    );

    return res.json({
      success: true,
      message: "Admin account created successfully",
      adminId: result.rows[0].id,
      token: "admin-" + result.rows[0].id
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// pornește serverul
app.listen(process.env.PORT || 3000, () =>
  console.log("Backend running on port " + (process.env.PORT || 3000))
);
