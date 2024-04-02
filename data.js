const express = require('express');
const router = express.Router();
const pool = require('./pool');
const columnMap = require('./Objects');

router.get('/', async (req, res) => {
  try {
    const { username, organization } = req.query;

    // Convert organization to an integer if it's a valid number
    const organizationId = !isNaN(organization) ? parseInt(organization) : null;

    // Call the stored procedure GetPortfolioData
    const [rows] = await pool.query('CALL GetPortfolioData(?, ?)', [username, organizationId]);

    // Log the data received from the database
    console.log("Data fetched from the database:", rows);

    const data = rows.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        const newKey = columnMap[key] || key; // Use columnMap to map fields
        newRow[newKey] = key === 'MonthYear' ? formatDate(row[key], 10) : row[key]; // Format 'MonthYear' field
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
