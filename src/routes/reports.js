const express = require("express");
const router = express.Router();
const upload = require("../utils/upload");
const requireAuth = require("../middleware/auth");
const db = require("../db");
const reportQueue = require("../queues/reportQueue");

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT id, file_path, status, ai_summary, created_at
       FROM reports
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      reports: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET /reports/:id
 * Get single report details
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT id, file_path, status, extracted_text, ai_summary, created_at
       FROM reports
       WHERE id = $1 AND user_id = $2`,
      [reportId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.json({
      success: true,
      report: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post(
  "/upload",
  requireAuth,
  upload.single("report"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.user.userId;
      const filePath = req.file.path;
      console.log("file check", req.file);

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
        fileType: req.file.mimetype,
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
  }
);

module.exports = router;
