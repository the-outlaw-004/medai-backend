const express = require("express");
const router = express.Router();
const upload = require("../utils/upload");
const requireAuth = require("../middleware/auth");
const db = require("../db");
const reportQueue = require("../queues/reportQueue");

// Upload report (Protected)
router.post("/upload", requireAuth, upload.single("report"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user.userId;
    const filePath = req.file.path;

    // Save to DB (status: pending)
    const insertResult = await db.query(
      "INSERT INTO reports (user_id, file_path, status) VALUES ($1, $2, 'pending') RETURNING id",
      [userId, filePath]
    );

    const reportId = insertResult.rows[0].id;

    // Push job to queue
    const job = await reportQueue.add("processReport", {
      reportId,
      userId,
      filePath,
    });

    res.json({
      message: "Report uploaded successfully",
      reportId,
      jobId: job.id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;