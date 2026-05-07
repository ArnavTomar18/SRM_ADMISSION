const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

function buildReference() {
  return `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

router.post("/payment", auth, async (req, res) => {
  const targetStudentId = Number(req.body.studentId || req.body.std_id || req.student.id);
  const paymentMethod = req.body.payment_method || req.body.method;
  const amount = req.body.amount;
  const paymentReference = req.body.payment_reference || req.body.reference || buildReference();

  if (!targetStudentId || !paymentMethod || amount == null) {
    return res.status(400).json({
      success: false,
      message: "studentId, payment method, and amount are required."
    });
  }

  if (req.student.id !== targetStudentId) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  const validMethods = ["UPI", "Card", "Net Banking", "DD"];
  if (!validMethods.includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: `Invalid payment method. Use: ${validMethods.join(", ")}`
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [allocationRows] = await conn.query(
      "SELECT id, status FROM allocations WHERE student_id = ?",
      [targetStudentId]
    );

    if (allocationRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "No seat allocation found." });
    }

    const allocation = allocationRows[0];
    if (allocation.status === "REJECTED") {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Allocation is rejected." });
    }

    const [existingPaymentRows] = await conn.query(
      "SELECT id, status FROM payments WHERE allocation_id = ?",
      [allocation.id]
    );

    if (existingPaymentRows.length > 0 && existingPaymentRows[0].status === "SUCCESS") {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Payment already completed." });
    }

    if (existingPaymentRows.length > 0) {
      await conn.query(
        `UPDATE payments
         SET amount = ?, payment_method = ?, payment_reference = ?, status = 'SUCCESS'
         WHERE id = ?`,
        [amount, paymentMethod, paymentReference, existingPaymentRows[0].id]
      );
    } else {
      await conn.query(
        `INSERT INTO payments
          (student_id, allocation_id, amount, payment_method, payment_reference, status)
         VALUES (?, ?, ?, ?, ?, 'SUCCESS')`,
        [targetStudentId, allocation.id, amount, paymentMethod, paymentReference]
      );
    }

    await conn.query("UPDATE allocations SET status = 'CONFIRMED' WHERE id = ?", [allocation.id]);
    await conn.commit();

    return res.status(201).json({
      success: true,
      message: "Payment successful. Enrollment confirmed.",
      data: {
        allocation_id: allocation.id,
        amount,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        status: "SUCCESS"
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error("Payment Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  } finally {
    conn.release();
  }
});

router.get("/payment/:studentId", auth, async (req, res) => {
  const studentId = Number(req.params.studentId);

  if (req.student.id !== studentId) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  try {
    const [rows] = await db.query(
      `SELECT py.id, py.amount, py.payment_method, py.payment_reference, py.status, py.paid_at,
              a.id AS allocation_id,
              p.name AS program_name,
              c.name AS campus_name
       FROM payments py
       JOIN allocations a ON a.id = py.allocation_id
       JOIN programs p ON p.id = a.program_id
       JOIN campuses c ON c.id = p.campus_id
       WHERE py.student_id = ?
       ORDER BY py.paid_at DESC`,
      [studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "No payment record found." });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Get Payment Error:", err);
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

module.exports = router;
