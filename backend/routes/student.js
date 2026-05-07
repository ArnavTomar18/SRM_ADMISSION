const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const auth = require("../middleware/auth");
require("dotenv").config();

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, phone, password, campusId, programId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "name, email, and password are required."
    });
  }

  try {
    const [existing] = await db.query("SELECT id FROM student WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO student
        (full_name, email, password_hash, phone, preferred_campus_id, preferred_program_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, phone || null, campusId || null, programId || null]
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: {
        id: result.insertId,
        Std_ID: result.insertId,
        Name: name,
        Email: email
      }
    });
  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    const [rows] = await db.query("SELECT * FROM student WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, fullName: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      data: {
        id: user.id,
        Std_ID: user.id,
        Name: user.full_name,
        Email: user.email
      }
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

router.get("/student/:id", auth, async (req, res) => {
  const studentId = Number(req.params.id);

  if (req.student.id !== studentId) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  try {
    const [rows] = await db.query(
      `SELECT s.id, s.full_name, s.email, s.phone, s.created_at,
              c.name AS preferred_campus,
              p.name AS preferred_program
       FROM student s
       LEFT JOIN campuses c ON c.id = s.preferred_campus_id
       LEFT JOIN programs p ON p.id = s.preferred_program_id
       WHERE s.id = ?`,
      [studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Get Student Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

router.get("/students", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.full_name, s.email, s.phone, s.created_at,
              p.name AS preferred_program,
              c.name AS preferred_campus
       FROM student s
       LEFT JOIN programs p ON p.id = s.preferred_program_id
       LEFT JOIN campuses c ON c.id = s.preferred_campus_id
       ORDER BY s.created_at DESC`
    );

    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error("Get Students Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

module.exports = router;
