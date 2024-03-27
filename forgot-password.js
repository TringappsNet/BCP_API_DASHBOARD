const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require('./pool');

router.post('/', async (req, res) => {
  const { email } = req.body; // Assuming frontend sends email in request body
  try {
      console.log('Executing SQL query...');
      const [user] = await pool.query('SELECT * FROM users WHERE Email = ?', [email]);
      console.log('User found in database:', user);
      if (!user || user.length === 0) {
          console.log('Email not found in database');
          return res.status(404).json({ message: 'Email not found' });
      }
      console.log('User ID:', user[0].UserID); // Log user ID
      const resetTokenData = generateResetToken(user[0].UserID);
      await updateResetToken(resetTokenData.token, user[0].UserID); // Update the user table with the reset token
      await sendResetLink(email, resetTokenData.token);
      return res.status(200).json({ message: 'Reset link sent successfully' });
  } catch (error) {
      console.error('Error executing SQL query:', error);
      return res.status(500).json({ message: 'Internal server error' });
  }
});
function generateResetToken(userId) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = userId.toString(); // Include user ID in the token
    for (let i = 0; i < 10; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return { token, userId };
}
async function updateResetToken(resetToken, userId) {
    try {
        await pool.query('UPDATE users SET resetToken = ? WHERE UserID = ?', [resetToken, userId]);
        console.log('Reset token updated in user table');
    } catch (error) {
        console.error('Error updating reset token in user table:', error);
        throw error;
    }
}
async function sendResetLink(email, resetToken) {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'sandhya.k@tringapps.net',
                pass: 'lmzc dfhi zfqc wjab'
            }
        });
        const resetLink = `http://localhost:3002/reset-password?token=${resetToken}`;
        const mailOptions = {
            from: 'sender@example.com',
            to: email,
            subject: 'Reset Your Password',
            text: `To reset your password, click on the following link: ${resetLink}`
        };
        await transporter.sendMail(mailOptions);
        console.log('Reset link email sent successfully');
    } catch (error) {
        console.error('Error sending reset link email:', error);
        throw error;
    }
}
module.exports = router;