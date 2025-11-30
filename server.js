require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const db = require("./src/db");

const app = express();
app.use(express.json());
app.use(morgan("tiny"));
app.get("/", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);
app.get("/health/db", async (req, res) => {
  try {
    const r = await db.query("SELECT 1+1 AS ok");
    res.json({ ok: r.rows[0].ok });
  } catch (err) {
    res.status(500).json({ error: "db error", detail: err.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on ${port}`));
