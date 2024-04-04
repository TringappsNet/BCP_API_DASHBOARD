const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require('./pool');
const crypto = require('crypto');
require('dotenv').config();

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

/**
 * @swagger
 * /invitation:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Send invitation email
 *     description: |
 *       Sends an invitation email to the specified email address, allowing the recipient to join the platform.
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
 *                 description: The email address of the recipient.
 *               role:
 *                 type: string
 *                 description: The role to be assigned to the invited user.
 *               organization:
 *                 type: string
 *                 description: The organization to which the invited user belongs.
 *     responses:
 *       '200':
 *         description: Invitation sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating that the invitation email has been sent successfully.
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the organization or role specified in the request does not exist.
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
router.post('/', async (req, res) => {
  const { email, role, organization } = req.body;
  const userName = extractUserName(email);
  
  try {
    // Get organization ID from the organization table
    const orgResult = await pool.query('SELECT org_ID FROM organization WHERE org_name = ?', [organization]);
    if (orgResult.length === 0) {
      return res.status(400).json({ message: 'Organization not found' });
    }
    const orgID = orgResult[0][0].org_ID;

    // Get role ID from the role table
    const roleResult = await pool.query('SELECT role_ID FROM role WHERE role = ?', [role]);
    if (roleResult.length === 0) {
      return res.status(400).json({ message: 'Role not found' });
    }
    const roleID = roleResult[0][0].role_ID;

    // Generate a unique invite token using SHA-256
    const inviteToken = generateInviteToken();
    
    // Store the invite token in the database along with organization ID and role ID
    await pool.query('INSERT INTO users (email, UserName, Role_ID, Org_ID, isActive, InviteToken) VALUES (?, ?, ?, ?, ?, ?)', [email, userName, roleID, orgID, false, inviteToken]);
    
    // Send invitation email with the invite token
    await sendInvitationEmail(email, inviteToken, req.headers['Session-ID'], req.headers['Email']);
    
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

async function sendInvitationEmail(email, inviteToken, sessionId, userEmail) {
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
    const inviteLink = `http://192.168.1.129:3002/register?token=${encodeURIComponent(inviteToken)}`;
    const mailOptions = {
      from: 'sender@example.com',
      to: email,
      subject: 'Invitation to join our platform',
      text: `Hi there! You've been invited to join our platform. Your invitation link is: ${inviteLink}`,
      headers: {
        'Session-ID': sessionId,
        'Email': userEmail
      }
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
