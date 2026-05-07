const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/counselling", auth, async (req, res) => {
  const { studentId, campusId, programId, preferenceOrder } = req.body;
  const targetStudentId = Number(studentId || req.student.id);

  if (!targetStudentId || !programId) {
    return res.status(400).json({
      success: false,
      message: "studentId and programId are required."
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

    const [programRows] = await db.query(
      "SELECT id, campus_id FROM programs WHERE id = ?",
      [programId]
    );
    if (programRows.length === 0) {
      return res.status(404).json({ success: false, message: "Program not found." });
    }

    if (campusId && Number(programRows[0].campus_id) !== Number(campusId)) {
      return res.status(400).json({
        success: false,
        message: "Selected program does not belong to the selected campus."
      });
    }

    await db.query(
      `DELETE FROM counselling_choices
       WHERE student_id = ? AND (program_id = ? OR preference_order = ?)`,
      [targetStudentId, programId, preferenceOrder || 1]
    );

    await db.query(
      `INSERT INTO counselling_choices (student_id, campus_id, program_id, preference_order)
       VALUES (?, ?, ?, ?)`,
      [
        targetStudentId,
        Number(programRows[0].campus_id),
        programId,
        preferenceOrder || 1
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Counselling choice saved successfully."
    });
  } catch (err) {
    console.error("Counselling Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

router.get("/counselling/:studentId", auth, async (req, res) => {
  const studentId = Number(req.params.studentId);

  if (req.student.id !== studentId) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  try {
    const [rows] = await db.query(
      `SELECT cc.id, cc.preference_order, cc.created_at,
              p.campus_id AS campus_id,
              p.id AS program_id, p.name AS program_name,
              c.name AS campus_name
       FROM counselling_choices cc
       JOIN programs p ON p.id = cc.program_id
       JOIN campuses c ON c.id = p.campus_id
       WHERE cc.student_id = ?
       ORDER BY cc.preference_order ASC`,
      [studentId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Get Counselling Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

module.exports = router;
