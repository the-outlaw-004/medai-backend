const db = require('../config/db')

async function deleteByUserId(userId) {
  const { rows } = await db.query("DELETE FROM refresh_tokens WHERE user_id=$1", [
            userId,
          ]);
  return rows[0];
}

module.exports = { deleteByUserId };
