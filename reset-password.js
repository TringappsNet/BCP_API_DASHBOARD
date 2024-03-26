const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');

router.post('/', async (req, res) => {
  const { resetToken, newPassword } = req.body;

  try {
    const [user] = await pool.query('SELECT * FROM users WHERE resetToken = ?', [resetToken]);

    if (!user || user.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Check if the reset token has expired
    const currentTimestamp = Date.now();

    if (user[0].resetTokenExpiry && currentTimestamp > user[0].resetTokenExpiry.getTime()) {
            return res.status(400).json({ message: 'Reset token has expired' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt();
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update the user's password in the database
    await pool.query('UPDATE users SET PasswordHash = ?, Salt = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE UserID = ?', [newPasswordHash, salt, user[0].UserID]);

    // Respond with success message
    return res.status(200).json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;
