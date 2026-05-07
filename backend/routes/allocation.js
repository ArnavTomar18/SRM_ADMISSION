const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

function calculateAggregate(markRow, examRow) {
  const pcm = Number(markRow.physics) + Number(markRow.chemistry) + Number(markRow.mathematics);
  const schoolAverage = pcm / 3;
  const examScore = examRow ? Number(examRow.score) : 0;
  return Number((schoolAverage * 0.6 + examScore * 0.4).toFixed(2));
}

router.post("/allocateSeat", auth, async (req, res) => {
  const targetStudentId = Number(req.body.studentId || req.body.std_id || req.student.id);

  if (!targetStudentId) {
    return res.status(400).json({ success: false, message: "studentId is required." });
  }

  if (req.student.id !== targetStudentId) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  try {
    const [studentRows] = await db.query("SELECT id FROM student WHERE id = ?", [targetStudentId]);
    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const [markRows] = await db.query("SELECT * FROM academic_marks WHERE student_id = ?", [targetStudentId]);
    if (markRows.length === 0) {
      return res.status(400).json({ success: false, message: "Academic marks not found." });
    }

    const [examRows] = await db.query(
      "SELECT * FROM entrance_exams WHERE student_id = ? ORDER BY score DESC LIMIT 1",
      [targetStudentId]
    );
    const [choiceRows] = await db.query(
      `SELECT cc.program_id, cc.preference_order, p.name, p.seat_capacity, p.min_cutoff
       FROM counselling_choices cc
       JOIN programs p ON p.id = cc.program_id
       WHERE cc.student_id = ?
       ORDER BY cc.preference_order ASC`,
      [targetStudentId]
    );

    if (choiceRows.length === 0) {
      return res.status(400).json({ success: false, message: "No counselling choices found." });
    }

    const aggregateScore = calculateAggregate(markRows[0], examRows[0]);
    let selectedChoice = null;

    for (const choice of choiceRows) {
      const [countRows] = await db.query(
        "SELECT COUNT(*) AS allocated_count FROM allocations WHERE program_id = ? AND status IN ('ALLOCATED', 'CONFIRMED')",
        [choice.program_id]
      );

      if (
        aggregateScore >= Number(choice.min_cutoff) &&
        Number(countRows[0].allocated_count) < Number(choice.seat_capacity)
      ) {
        selectedChoice = choice;
        break;
      }
    }

    if (!selectedChoice) {
      return res.status(200).json({
        success: false,
        message: "No seat available for current score and preferences.",
        data: { aggregate_score: aggregateScore }
      });
    }

    await db.query(
      `INSERT INTO allocations (student_id, program_id, aggregate_score, status)
       VALUES (?, ?, ?, 'ALLOCATED')
       ON DUPLICATE KEY UPDATE
         program_id = VALUES(program_id),
         aggregate_score = VALUES(aggregate_score),
         status = 'ALLOCATED'`,
      [targetStudentId, selectedChoice.program_id, aggregateScore]
    );

    const [allocationRows] = await db.query(
      `SELECT a.id, a.aggregate_score, a.status, a.allocation_date,
              p.name AS program_name, c.name AS campus_name
       FROM allocations a
       JOIN programs p ON p.id = a.program_id
       JOIN campuses c ON c.id = p.campus_id
       WHERE a.student_id = ?`,
      [targetStudentId]
    );

    return res.status(201).json({
      success: true,
      message: "Seat allocated successfully.",
      data: allocationRows[0]
    });
  } catch (err) {
    console.error("Allocate Seat Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

router.get("/allocation/:studentId", auth, async (req, res) => {
  const studentId = Number(req.params.studentId);

  if (req.student.id !== studentId) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  try {
    const [rows] = await db.query(
      `SELECT a.id, a.aggregate_score, a.status, a.allocation_date,
              p.id AS program_id, p.name AS program_name,
              c.id AS campus_id, c.name AS campus_name
       FROM allocations a
       JOIN programs p ON p.id = a.program_id
       JOIN campuses c ON c.id = p.campus_id
       WHERE a.student_id = ?`,
      [studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "No seat allocated yet." });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Get Allocation Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

module.exports = router;
