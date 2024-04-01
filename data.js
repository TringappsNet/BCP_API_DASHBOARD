const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const columnMap = require('./bulk-upload');

router.get('/', async (req, res) => {
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
    const { username } = req.query;

    const [rows] = await pool.query('SELECT * FROM Portfolio_Companies_format WHERE UserName = ?', [username]);
    console.log("Username",username);
    const data = rows.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        // Exclude the second and third columns
        if (key !== 'Organization' && key !== 'UserName') {
          const newKey = columnMap[key] || key;
          newRow[newKey] = key === 'Month/Year' ? formatDate(row[key],10) : row[key];
        }
      });
      return newRow;
    });
    res.status(200).json(data);
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).json({ message: 'Error retrieving data' });
  }
});

// Function to format date as "Jan 22"
function formatDate(dateString) {
  const date = new Date(dateString);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${month} ${year}`;
}

module.exports = router;
