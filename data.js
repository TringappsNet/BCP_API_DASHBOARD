const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const columnMap = require('./Objects');

router.get('/', async (req, res) => {
  try {
    const { username, organization } = req.query;

    let query = 'SELECT * FROM Portfolio_Companies_format WHERE UserName = ?';
    const queryParams = [username];

    if (organization) {
      query += ' AND Organization = ?';
      queryParams.push(organization);
    }

    const [rows] = await pool.query(query, queryParams);
    console.log("Username", username);
    const data = rows.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        // Exclude the second and third columns
        if (key !== 'Organization' && key !== 'UserName') {
          const newKey = columnMap[key] || key;
          newRow[newKey] = key === 'Month/Year' ? formatDate(row[key], 10) : row[key];
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
