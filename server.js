require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const db = require("./src/config/db");
const cookieParser = require("cookie-parser");
const authRoutes = require("./src/routes/auth");
const reportRoutes = require("./src/routes/reports");

const app = express();
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(cookieParser());
app.use(morgan("tiny"));
app.get("/", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

app.use("/auth", authRoutes);
app.use("/report", reportRoutes);

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
