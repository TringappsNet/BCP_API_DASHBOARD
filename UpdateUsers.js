const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.post('/', async (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');
  
  // if (!sessionId || !emailHeader) {
  //   return res.status(400).json({ message: 'Session ID and Email headers are required!' });
  // }
    
  // if (email !== emailHeader) {
  //   return res.status(401).json({ message: 'Unauthorized: Email header does not match user data!' });
  // }

  try {
    const { email, Role, Organization } = req.body;

    // Check if email, role, and organization are provided
    if (!email || !Role || !Organization) {
      return res.status(400).json({ error: 'Email, Role, and Organization are required in the request body' });
    }

    // Query organization table to get org_ID
    const [orgResult] = await pool.query('SELECT org_ID FROM organization WHERE org_name = ?', [Organization]);
    const org_ID = orgResult.length > 0 ? orgResult[0].org_ID : null;

    // Query role table to get role_ID
    const [roleResult] = await pool.query('SELECT role_ID FROM role WHERE role = ?', [Role]);
    const role_ID = roleResult.length > 0 ? roleResult[0].role_ID : null;

    // Check if organization and role exist
    if (!org_ID || !role_ID) {
      return res.status(404).json({ error: 'Organization or Role not found' });
    }

    // Execute the SQL query to update user role and organization
    const result = await pool.query('UPDATE users SET Role_ID = ?, Org_ID = ? WHERE Email = ?', [role_ID, org_ID, email]);

    // Check if the update was successful
    if (result[0].affectedRows === 1) {
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
