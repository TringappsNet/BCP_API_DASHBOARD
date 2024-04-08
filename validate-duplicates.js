/**
 * @swagger
 * /validate-duplicates:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Validate duplicate data
 *     description: Validates duplicate data for a given user and organization.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userData:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                     description: The username
 *                   organization:
 *                     type: string
 *                     description: The organization name
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *                   description: Data to be validated
 *     responses:
 *       '200':
 *         description: Successfully validated duplicates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       isDuplicate:
 *                         type: boolean
 *                         description: Indicates whether the data is a duplicate or not
 *                       rowId:
 *                         type: integer
 *                         description: The ID of the duplicate row, if it exists
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating the reason for the bad request
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating the internal server error
 */

const express = require('express');
const router = express.Router();
const pool = require('./pool');
const columnMap = require('./Objects');

router.post('/', async (req, res) => {
    const { userData, data } = req.body;
    const { userId, Org_ID } = userData;

    if (!Array.isArray(data) || !data.every(item => typeof item === 'object')) {
      return res.status(400).json({ message: 'Invalid JSON body format' });
    }
  
  
    try {
      const connection = await pool.getConnection();
      const duplicatePromises = data.map(async row => {
        const keys = Object.keys(row);  
        const mappedKeys = ['Org_ID', 'UserID', ...Object.keys(row).map(key => columnMap[key])];
        const mappedValues = [Org_ID, userId, ...Object.values(row)
            .map((value) => (keys[mappedKeys.indexOf('Month/Year')] === 'Month/Year')
              ? value.replace(/ /g, '') : value
            )
          ];        
          
  
        const monthYearValue = mappedValues[mappedKeys.indexOf('MonthYear')];
  
        const query = 'SELECT COUNT(*) as count FROM Portfolio_Companies_format WHERE UserID = ? AND Org_ID = ? AND MonthYear = ?';
        const result = await connection.query(query, [userId, Org_ID, monthYearValue]);
        const isDuplicate = result[0][0].count > 0;

        
        return {
          isDuplicate: isDuplicate,
          rowId: result[0][0].id || null,

        };
      });
  
      const results = await Promise.all(duplicatePromises);
      res.status(200).json({ data: results });
      connection.release();
    } catch (error) {
      console.error('Error validating duplicates:', error);
      res.status(500).json({ message: 'Error validating duplicates' });
    }
  });
  
module.exports = router;
