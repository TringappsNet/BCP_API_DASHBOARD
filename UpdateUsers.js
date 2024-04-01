const express = require('express');
const router = express.Router();
const pool = require('./pool');

// POST endpoint to update user role and organization
router.post('/', async (req, res) => {
    const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');
  
  if (!sessionId || !emailHeader) {
    return res.status(400).json({ message: 'Session ID and Email headers are required!' });
  }
  
  // You may want to validate sessionId against your session data in the database
  
  if (email !== emailHeader) {
    return res.status(401).json({ message: 'Unauthorized: Email header does not match user data!' });
  }

    try {
        // Extract email, role ID, and organization from request body
        const { email, Role, Organization } = req.body;

        // Check if email, role ID, and organization are provided
        if (!email || !Role || !Organization) {
            return res.status(400).json({ error: 'Email, Role, and Organization are required in the request body' });
        }

        // Execute the SQL query to update user role and organization
        const result = await pool.query('UPDATE users SET Role = ?, Organization = ? WHERE Email = ?', [Role, Organization, email]);

        // Check if the update was successful
        if (result.affectedRows === 1) {
            return res.status(200).json({ message: 'User role and organization updated successfully' });
        } else {
            return res.status(500).json({ error: 'Failed to update user role and organization' });
        }
    } catch (error) {
        console.error('Error updating user role and organization:', error);
        return res.status(500).json({ error: 'Error updating user role and organization' });
    }
});

module.exports = router;
