const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require('./pool');
require('dotenv').config();

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

router.post('/', async (req, res) => {
  const { email, role, organization } = req.body;
  const userName = extractUserName(email);

  try {
    // Insert the user data into the database
    await pool.query('INSERT INTO users (email, UserName, Role, Organization, isActive) VALUES (?, ?, ?, ?, ?)', [email, userName, role, organization, false]);
    
    // Send invitation email
    await sendInvitationEmail(email);
    
    // Return success response
    return res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Function to extract username from email
function extractUserName(email) {
  return email.split('@')[0];
}

async function sendInvitationEmail(email) {
    try {
      // Generate invite token and expiry time
      const inviteToken = generateInviteToken();
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 24);
  
      // Update user record with invite token and expiry time
      await pool.query('UPDATE users SET InviteToken = ?, InviteTime = ?, isActive = ? WHERE Email = ?', [inviteToken, expiryTime, true, email]);
  
      // Create transporter for sending email
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });
  
      // Construct invitation email
      const inviteLink = `http://192.168.1.50:3000/register?token=${inviteToken}`; 
      const mailOptions = {
        from: 'your_email@example.com',
        to: email,
        subject: 'Invitation to join our platform',
        text: `Hi there! You've been invited to join our platform. Your invitation Link is: ${inviteLink}`
      };
  
      // Send invitation email
      await transporter.sendMail(mailOptions);
      console.log('Invitation email sent successfully');
    } catch (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }
}

// Function to generate a random invite token
function generateInviteToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

module.exports = router;
