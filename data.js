const express = require('express');
const router = express.Router();
const pool = require('./pool');
const columnMap = require('./Objects');

/**
 * @swagger
 * /data:
 *   get:
 *     tags: ['Portfolio']
 *     summary: Retrieve portfolio data
 *     description: Retrieves portfolio data based on the provided username and organization.
 *     parameters:
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         required: true
 *         description: The username for which to retrieve portfolio data
 *       - in: query
 *         name: organization
 *         schema:
 *           type: integer
 *         required: false
 *         description: The organization ID for which to retrieve portfolio data
 *     responses:
 *       '200':
 *         description: Portfolio data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   fieldName:
 *                     type: string
 *                     description: Description of the field
 *                   # Add other properties here
 *                   MonthYear:
 *                     type: string
 *                     format: date
 *                     description: Date in "MMM YY" format
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 */

router.get('/', async (req, res) => {
  try {
    const { username, organization } = req.query;

    // Convert organization to an integer if it's a valid number
    const organizationId = !isNaN(organization) ? parseInt(organization) : null;

    // Call the stored procedure GetPortfolioData
    const [result] = await pool.query('CALL GetPortfolioData(?, ?)', [username, organizationId]);
    const rows = result[0]; // Extracting the actual data from the ResultSet

    // Log the data received from the database (without ResultSetHeader)
    console.log(rows[0]);

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
