const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const columnMap = require('./Objects');

/**
 * @swagger
 * /UserData:
 *   get:
 *     tags: ['Portfolio']
 *     summary: Retrieve Excel data
 *     description: Retrieves data from the ExcelData table.
 *     responses:
 *       '200':
 *         description: Successful response with Excel data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   columnName1:
 *                     type: string
 *                     description: Description of column 1
 *                   columnName2:
 *                     type: string
 *                     description: Description of column 2
 *                   # Add other column properties here
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
        const [rows] = await pool.query('SELECT * FROM exceldata');
        const data = rows.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => {
            const newKey = columnMap[key] || key;
            newRow[newKey] = row[key];
          });
          return newRow;
        });
        res.status(200).json(data);
      } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ message: 'Error retrieving data' });
      }});
module.exports = router;