// SIGNUP ADMIN
app.post("/signup", async (req, res) => {
  const { signupToken, email, password } = req.body;

  try {
    if (signupToken !== ADMIN_SIGNUP_TOKEN) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin signup token"
      });
    }

    const check = await pool.query(
      "SELECT id FROM useradmin WHERE email = $1 LIMIT 1",
      [email]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO useradmin (email, parola) VALUES ($1, $2) RETURNING id",
      [email, hashedPassword]
    );

    return res.json({
      success: true,
      message: "Admin created successfully",
      adminId: result.rows[0].id
    });

  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});
// LOGIN ADMIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = "SELECT * FROM useradmin WHERE email = $1 LIMIT 1";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Email sau parolă invalidă"
      });
    }

    const admin = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, admin.parola);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email sau parolă invalidă"
      });
    }

    return res.json({
      success: true,
      message: "Login reușit",
      adminId: admin.id,
      token: "admin-" + admin.id
    });

  } catch (err) {
    console.error("EROARE LOGIN:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});
