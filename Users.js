const express = require('express');
const router = express.Router();
const pool = require('./pool'); // Adjust the path as per your directory structure

router.get('/', async (req, res) => {
  try {
    // Retrieve user information including organization name and role
    const query = `
      SELECT 
        u.UserID,
        u.UserName, 
        u.Email, 
        o.org_name AS Organization, 
        r.role AS Role, 
        u.isActive
      FROM 
        users u
      LEFT JOIN 
        organization o ON u.Org_ID = o.org_ID
      LEFT JOIN 
        role r ON u.Role_ID = r.role_ID;
    `;

    // Execute the query using the pool
    pool.query(query, (error, rows) => {
      if (error) {
        console.error('Error executing query:', error);
        return res.status(500).json({ error: 'Error retrieving users' });
      }

      // Send back the array of user information
      res.status(200).json(rows);
    });
  } catch (error) {
    // If an error occurs, send a 500 Internal Server Error response
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Error retrieving users' });
  }
});

module.exports = router;
  