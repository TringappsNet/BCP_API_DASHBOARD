const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.get('/', async (req, res) => {
  try {
    // Query the database to retrieve user information along with organization name and role
    const query = `
      SELECT u.UserName, o.org_name AS Organization, u.Email, r.role AS Role
      FROM users u
      LEFT JOIN organization o ON u.Org_ID = o.org_ID
      LEFT JOIN role r ON u.Role_ID = r.role_ID
    `;
    const [rows] = await pool.query(query);
    
    // Send back the array of user information
    res.status(200).json(rows);
  } catch (error) {
    // If an error occurs, send a 500 Internal Server Error response
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Error retrieving users' });
  }
});

module.exports = router;
