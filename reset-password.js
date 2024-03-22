const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');

router.post('/', async (req, res) => {
  const { userName, oldPassword, newPassword } = req.body;

  if (!userName || !oldPassword || !newPassword) {
      return res.status(400).json({ message: 'UserName, old password, and new password are required' });
  }

  try {
      await pool.query('CALL ResetPassword(?, ?, ?)', [userName, oldPassword, newPassword]);
      res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
console.error("Error resetting password:", error);
      res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;