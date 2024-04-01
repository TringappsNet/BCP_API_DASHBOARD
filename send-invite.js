const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require('./pool');
const crypto = require('crypto');
require('dotenv').config();

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

router.post('/', async (req, res) => {
  const { email, role, organization } = req.body;
  const userName = extractUserName(email);
  
  try {
    // Generate a unique invite token using SHA-256
    const inviteToken = generateInviteToken();
    
    // Store the invite token in the database
    await pool.query('INSERT INTO users (email, UserName, Role, Organization, isActive, InviteToken) VALUES (?, ?, ?, ?, ?, ?)', [email, userName, role, organization, false, inviteToken]);
    
    // Send invitation email with the invite token
    await sendInvitationEmail(email, inviteToken);
    
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

async function sendInvitationEmail(email, inviteToken) {
  try {
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

    // Construct invitation email with the invite token in the link
    const inviteLink = `http://localhost:3002/register?token=${encodeURIComponent(inviteToken)}`;
    const mailOptions = {
      from: 'sender@example.com',
      to: email,
      subject: 'Invitation to join our platform',
      text: `Hi there! You've been invited to join our platform. Your invitation link is: ${inviteLink}`
    };

    // Send invitation email
    await transporter.sendMail(mailOptions);
    console.log('Invitation email sent successfully');
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
}

// Function to generate a unique invite token using SHA-256
function generateInviteToken() {
  const token = crypto.randomBytes(32).toString('hex'); // Generate a random token
  return crypto.createHash('sha256').update(token).digest('hex'); // Hash the token using SHA-256
}

module.exports = router;
