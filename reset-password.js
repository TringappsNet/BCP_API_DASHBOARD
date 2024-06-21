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

router.post('/', async (req, res) => {
  const email = req.header('Email-ID');
  const sessionId = req.header('Session-ID');
  const { resetToken, newPassword } = req.body;

  // Validate headers and request body
  if (!email || !sessionId) {
    return res.status(400).json({ message: 'Email-ID and Session-ID headers are required!' });
  }
  if (!resetToken || !newPassword) {
    return res.status(400).json({ message: 'resetToken and newPassword are required in the request body' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Check if the user exists with the provided reset token
    const [rows] = await connection.query('SELECT * FROM users WHERE resetToken = ?', [resetToken]);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const user = rows[0];

    // Hash the new password
    const salt = await bcrypt.genSalt();
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update the user's password in the database
    await connection.query('UPDATE users SET PasswordHash = ?, Salt = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE UserID = ?', [newPasswordHash, salt, user.UserID]);

    // Respond with success message
    return res.status(200).json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ message: 'Error resetting password' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
