const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.get('/', async (req, res) => {
  try {
    // Query the database to retrieve all users
    const [rows] = await pool.query('SELECT UserName, Organization, Email, Role FROM Users');
    
    // Send back the array of user information
    res.status(200).json(rows);
  } catch (error) {
    // If an error occurs, send a 500 Internal Server Error response
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Error retrieving users' });
  }
});

module.exports = router;
