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
  let connection;
    try {
      
const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.put('/', async (req, res) => {
    const { email, isActive } = req.body;

    let connection;
    try {
        connection = await pool.getConnection();

        // Check if email and isActive are provided
        if (!email || isActive === undefined || isActive === null) {
            return res.status(400).json({ error: 'Email and isActive parameter are required!' });
        }

        // Execute SQL query to update isActive column
        const result = await connection.query('UPDATE users SET isActive = ? WHERE Email = ?', [isActive, email]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found!' });
        }

        // Send success response
        return res.status(200).json({ message: 'User isActive status updated successfully' });
    } catch (error) {
        console.error("Error updating user isActive status:", error);
        return res.status(500).json({ error: 'Error updating user isActive status' });
    }
});

module.exports = router;

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