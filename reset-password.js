const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');

router.post('/', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in first.' });
  }

  if (!req.session.userName || !newPassword) {
    return res.status(400).json({ message: 'UserName and new password are required' });
  }

  try {
    // Check if the user exists in the database and if the session user matches the database user
    const [rows] = await pool.query('SELECT * FROM users WHERE UserName = ?', [req.session.userName]);
    if (rows.length === 0 || rows[0].ID !== req.session.userId) {
      return res.status(400).json({ message: 'User not found or session expired' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt();
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update the user's password in the database using the user's ID
    const updateQuery = 'UPDATE users SET Password = ?, Salt = ? WHERE ID = ?';
    await pool.query(updateQuery, [newPasswordHash, salt, rows[0].ID]);

    console.log("Password reset successfully!");
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;

