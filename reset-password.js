const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');

/**
 * @swagger
 * /reset-password:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Reset user password
 *     description: Reset the password for a user with the provided reset token.
 *     parameters:
 *       - in: header
 *         name: Email-ID
 *         description: User's email address
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Session-ID
 *         description: User's session ID
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resetToken:
 *                 type: string
 *                 description: The reset token received by the user
 *               newPassword:
 *                 type: string
 *                 description: The new password for the user
 *             required:
 *               - resetToken
 *               - newPassword
 *     responses:
 *       '200':
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Message indicating successful password reset
 *       '400':
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *     security:
 *       - apiKey: []
 */
router.post('/', (req, res) => {

  const email = req.header('Email-ID');
  const sessionId = req.header('Session-ID');

  // Validate headers
  if (!email || !sessionId) {
    return res.status(400).json({ message: 'Email-ID and Session-ID headers are required!' });
  }

  const { resetToken, newPassword } = req.body;

  pool.query('SELECT * FROM users WHERE resetToken = ?', [resetToken], async (err, rows) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      return res.status(500).json({ message: 'Error resetting password' });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const user = rows[0];

    try {
      // Hash the new password
      const salt = await bcrypt.genSalt();
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      pool.query('UPDATE users SET PasswordHash = ?, Salt = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE resetToken = ?', 
        [newPasswordHash, salt, resetToken], 
        (updateErr) => {
          if (updateErr) {
            console.error('Error updating password in database:', updateErr);
            return res.status(500).json({ message: 'Error resetting password' });
          }

          console.log('Password reset successfully!');
          return res.status(200).json({ message: 'Password reset successfully' });
        }
      );
    } catch (hashError) {
      console.error('Error hashing new password:', hashError);
      return res.status(500).json({ message: 'Error resetting password' });
    }
  });
});

module.exports = router;
