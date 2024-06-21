/**
 * @swagger
 * /forgot-password:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Send password reset link
 *     description: Sends a password reset link to the provided email address.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email address to send the password reset link.
 *     responses:
 *       '200':
 *         description: Reset link sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating that the reset link has been sent successfully.
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the email provided is invalid.
 *       '404':
 *         description: Email not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the provided email was not found.
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating an internal server error.
 */

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require('./pool');
const crypto = require('crypto');
const { emailRegex } = require('./Objects');
require('dotenv').config();

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

router.post('/', (req, res) => {
  const { email } = req.body;

  // Validate email using regex
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  pool.query('SELECT * FROM users WHERE Email = ?', [email], (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Email not found' });
    }

    const user = results[0];

    if (user.isActive === 0) {
      return res.status(400).json({ message: 'User Inactive. Please contact the administrator for further assistance.' });
    }

    const resetToken = generateResetToken(user.UserID);
    updateResetToken(resetToken, user.UserID, (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      sendResetLink(email, resetToken, (emailErr) => {
        if (emailErr) {
          return res.status(500).json({ message: 'Internal server error' });
        }
        return res.status(200).json({ message: 'Reset link sent successfully' });
      });
    });
  });
});

function generateResetToken(userId) {
  // Generate a unique token
  const token = userId.toString() + Math.random().toString(36).substr(2, 10);
  // Hash the token using SHA-256
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return hashedToken;
}

function updateResetToken(resetToken, userId, callback) {
  pool.query('UPDATE users SET resetToken = ? WHERE UserID = ?', [resetToken, userId], (err) => {
    if (err) {
      console.error('Error updating reset token in user table:', err);
      return callback(err);
    }
    callback(null);
  });
}

function sendResetLink(email, resetToken, callback) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  const resetLink = `https://bcpportal.azurewebsites.net/reset-password?token=${encodeURIComponent(resetToken)}`;

  const mailOptions = {
    from: 'sender@example.com',
    to: email,
    subject: 'Reset Your Password',
    text: `To reset your password, click on the following link: ${resetLink}`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending reset link email:', err);
      return callback(err);
    }
    callback(null);
  });
}

module.exports = router;
