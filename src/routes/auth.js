const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { createUser, findByEmail } = require("../services/userService");

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || 12, 10);

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and Password required" });
    const found = await findByEmail(email);
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser(email, hashed);
    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;