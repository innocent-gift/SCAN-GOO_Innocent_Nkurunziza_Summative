// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { pool } = require("../config/db");

function signToken(user) {
  return jwt.sign(
    { id: user.id, phone: user.phone, role: user.role, name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ success: false, message: "Phone and password required" });

    const [rows] = await pool.query("SELECT * FROM users WHERE phone = ?", [phone]);
    const user = rows[0];
    if (!user)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    res.json({
      success: true,
      token: signToken(user),
      user: { id: user.id, name: user.full_name, phone: user.phone, role: user.role },
    });
  } catch (err) { next(err); }
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { full_name, phone, password } = req.body;
    if (!full_name || !phone || !password)
      return res.status(400).json({ success: false, message: "All fields required" });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

    const [existing] = await pool.query("SELECT id FROM users WHERE phone = ?", [phone]);
    if (existing.length)
      return res.status(409).json({ success: false, message: "Phone already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (full_name, phone, password, role) VALUES (?, ?, ?, 'shopper')",
      [full_name, phone, hashed]
    );

    const user = { id: result.insertId, full_name, phone, role: "shopper" };
    res.status(201).json({
      success: true,
      token: signToken(user),
      user: { id: user.id, name: user.full_name, phone: user.phone, role: user.role },
    });
  } catch (err) { next(err); }
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, phone, role, created_at FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user: rows[0] });
  } catch (err) { next(err); }
}

module.exports = { login, register, me };
