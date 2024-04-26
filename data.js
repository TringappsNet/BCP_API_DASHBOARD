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
 *           type: string
 *         required: false
 *         description: The organization Name for which to retrieve portfolio data
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

const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.get('/', async (req, res) => {
  try {
    const { username, organization } = req.query;

    const organization_name = organization.toLowerCase().trim().replace(/\s/g, '');
    // Call the stored procedure GetPortfolioData
    const [result] = await pool.query('CALL GetPortfolioData(?, ?)', [username, organization_name]);
    const rows = result[0]; 
    const data = rows.map(row => {
      return row;
    });
    res.status(200).json(data);
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).json({ message: 'Error retrieving data' });
  }
});

module.exports = router;
