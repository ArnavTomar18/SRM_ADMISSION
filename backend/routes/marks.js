const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/addExam", auth, async (req, res) => {
  const { studentId, examName, score, rank } = req.body;
  const targetStudentId = Number(studentId || req.student.id);
  const normalizedExamName = String(examName || "").trim();

  if (!targetStudentId || !normalizedExamName || score == null) {
    return res.status(400).json({
      success: false,
      message: "studentId, examName, and score are required."
    });
  }

  if (req.student.id !== targetStudentId) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  try {
    const [studentRows] = await db.query("SELECT id FROM student WHERE id = ?", [targetStudentId]);
    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const [existingRows] = await db.query(
      `SELECT id
       FROM entrance_exams
       WHERE student_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [targetStudentId]
    );

    if (existingRows.length > 0) {
      await db.query(
        `UPDATE entrance_exams
         SET exam_name = ?, score = ?, exam_rank = ?
         WHERE id = ?`,
        [normalizedExamName, score, rank || null, existingRows[0].id]
      );

      await db.query(
        `DELETE FROM entrance_exams
         WHERE student_id = ? AND id <> ?`,
        [targetStudentId, existingRows[0].id]
      );

      return res.json({
        success: true,
        message: "Entrance exam updated successfully.",
        data: { id: existingRows[0].id }
      });
    }

    const [result] = await db.query(
      `INSERT INTO entrance_exams (student_id, exam_name, score, exam_rank)
       VALUES (?, ?, ?, ?)`,
      [targetStudentId, normalizedExamName, score, rank || null]
    );

    return res.status(201).json({
      success: true,
      message: "Entrance exam added successfully.",
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error("Add Exam Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

router.get("/marks/:studentId", auth, async (req, res) => {
  const targetStudentId = Number(req.params.studentId);

  if (req.student.id !== targetStudentId) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, student_id, physics, chemistry, mathematics, english
       FROM academic_marks
       WHERE student_id = ?`,
      [targetStudentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Academic marks not found." });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Get Marks Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

router.get("/exam/:studentId", auth, async (req, res) => {
  const targetStudentId = Number(req.params.studentId);

  if (req.student.id !== targetStudentId) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, student_id, exam_name, score, exam_rank, created_at
       FROM entrance_exams
       WHERE student_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [targetStudentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Entrance exam not found." });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Get Exam Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

router.post("/addMarks", auth, async (req, res) => {
  const { studentId, physics, chemistry, mathematics, english } = req.body;
  const targetStudentId = Number(studentId || req.student.id);

  if (!targetStudentId || physics == null || chemistry == null || mathematics == null) {
    return res.status(400).json({
      success: false,
      message: "studentId, physics, chemistry, and mathematics are required."
    });
  }

  if (req.student.id !== targetStudentId) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  try {
    const [studentRows] = await db.query("SELECT id FROM student WHERE id = ?", [targetStudentId]);
    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const [existing] = await db.query("SELECT id FROM academic_marks WHERE student_id = ?", [targetStudentId]);

    if (existing.length > 0) {
      await db.query(
        `UPDATE academic_marks
         SET physics = ?, chemistry = ?, mathematics = ?, english = ?
         WHERE student_id = ?`,
        [physics, chemistry, mathematics, english || null, targetStudentId]
      );

      return res.json({ success: true, message: "Academic marks updated successfully." });
    }

    const [result] = await db.query(
      `INSERT INTO academic_marks (student_id, physics, chemistry, mathematics, english)
       VALUES (?, ?, ?, ?, ?)`,
      [targetStudentId, physics, chemistry, mathematics, english || null]
    );

    return res.status(201).json({
      success: true,
      message: "Academic marks added successfully.",
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error("Add Marks Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

router.get("/campuses", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT id, name, location FROM campuses ORDER BY name");
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

router.get("/programs", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT MIN(p.id) AS id, p.campus_id, p.name,
              MAX(p.seat_capacity) AS seat_capacity,
              MAX(p.min_cutoff) AS min_cutoff,
              c.name AS campus_name
       FROM programs p
       JOIN campuses c ON c.id = p.campus_id
       GROUP BY p.campus_id, p.name, c.name
       ORDER BY c.name, p.name`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

module.exports = router;
