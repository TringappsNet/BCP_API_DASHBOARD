const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require('./pool');
const crypto = require('crypto');
require('dotenv').config();

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

router.post('/', async (req, res) => {
  const { email } = req.body;
  try {
    console.log('Executing SQL query...');
    const [user] = await pool.query('SELECT * FROM users WHERE Email = ?', [email]);
    if (!user || user.length === 0) {
      console.log('Email not found in database');
      return res.status(404).json({ message: 'Email not found' });
    }
    console.log('User ID:', user[0].UserID);
    const resetToken = generateResetToken(user[0].UserID);
    await updateResetToken(resetToken, user[0].UserID); 
    await sendResetLink(email, resetToken);
    return res.status(200).json({ message: 'Reset link sent successfully' });
  } catch (err) {
    console.error('Error executing SQL query:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

function generateResetToken(userId) {
  // Generate a unique token
  const token = userId.toString() + Math.random().toString(36).substr(2, 10);
  // Hash the token using SHA-256
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return hashedToken;
}

async function updateResetToken(resetToken, userId) {
  try {
    await pool.query('UPDATE users SET resetToken = ? WHERE UserID = ?', [resetToken, userId]);
    console.log('Reset token updated in user table');
  } catch (err) {
    console.error('Error updating reset token in user table:', err);
    throw err;
  }
}

async function sendResetLink(email, resetToken) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
    const resetLink = `http://localhost:3002/reset-password?=${encodeURIComponent(resetToken)}`;
    const mailOptions = {
      from: 'sender@example.com',
      to: email,
      subject: 'Reset Your Password',
      text: `To reset your password, click on the following link: ${resetLink}`
    };
    await transporter.sendMail(mailOptions);
    console.log('Reset link email sent successfully');
  } catch (err) {
    console.error('Error sending reset link email:', err);
    throw err;
  }
}

module.exports = router;
